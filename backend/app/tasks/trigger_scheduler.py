import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.worker import Zone
from app.services.trigger_monitor import monitor_zone_triggers
from app.services.claim_processor import process_claims_for_trigger
from app.core.config import settings

async def run_trigger_check():
    """
    Periodic task to check all zone triggers.
    """
    db = SessionLocal()
    try:
        zones = db.query(Zone).all()
        for zone in zones:
            print(f"Monitoring triggers for zone: {zone.name}")
            events = await monitor_zone_triggers(db, zone)
            for event in events:
                print(f"Trigger fired! Type: {event.trigger_type} in {zone.name}")
                process_claims_for_trigger(db, event)
    except Exception as e:
        print(f"Error in trigger scheduler: {e}")
    finally:
        db.close()

def setup_scheduler():
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        run_trigger_check, 
        'interval', 
        seconds=settings.TRIGGER_POLL_INTERVAL_SECONDS
    )
    return scheduler
