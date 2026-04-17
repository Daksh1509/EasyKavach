import uvicorn
import os
from app.core.config import settings

if __name__ == "__main__":
    # Check if DB exists, if not, create and seed
    if not os.path.exists("./easykavach.db"):
        print("Initializing database...")
        from app.seed.seed_data import seed_db
        seed_db()
    
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=settings.DEBUG
    )
