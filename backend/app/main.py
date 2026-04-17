from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
from app.tasks.trigger_scheduler import setup_scheduler
import contextlib

def ensure_worker_columns() -> None:
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    if "workers" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("workers")}
    required_columns = {
        "email": "VARCHAR",
        "pancard": "VARCHAR",
        "aadhaar": "VARCHAR",
    }

    with engine.begin() as connection:
        for column_name, column_type in required_columns.items():
            if column_name in existing_columns:
                continue
            connection.execute(text(f"ALTER TABLE workers ADD COLUMN {column_name} {column_type}"))

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database directory exists for SQLite
    if settings.DATABASE_URL.startswith("sqlite:///"):
        # raw_path will be something like /var/data/easykavach.db
        raw_path = settings.DATABASE_URL.replace("sqlite:///", "", 1)
        db_path = Path(raw_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Ensuring database directory exists: {db_path.parent}")

    # Create tables and run migrations
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    ensure_worker_columns()
    print("Database initialization complete.")

    # Startup: Start scheduler
    scheduler = setup_scheduler()
    scheduler.start()
    print("Background trigger scheduler started.")
    yield
    # Shutdown
    scheduler.shutdown()
    print("Background trigger scheduler stopped.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
origins = [
    "http://localhost:3000",
    "http://localhost:3005",
    "https://easykavach-ui.onrender.com",  # Update with your Render URL if different
]

import os
if os.getenv("RENDER_EXTERNAL_URL"):  # Add the Render-assigned dynamic URL
    origins.append(os.getenv("RENDER_EXTERNAL_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to EasyKavach API",
        "docs": "/docs",
        "version": settings.VERSION
    }
