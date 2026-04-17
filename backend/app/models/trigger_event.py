from sqlalchemy import Column, String, Float, DateTime, Boolean, JSON
import uuid
from datetime import datetime
from app.core.database import Base

class TriggerEvent(Base):
    __tablename__ = "trigger_events"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trigger_type = Column(String, nullable=False)  # e.g., "heavy_rain"
    zone_id = Column(String, nullable=False)  # matches Zone.id
    severity = Column(String, default="medium")  # "high", "medium", "low"
    raw_value = Column(Float)  # e.g., 65.0
    threshold = Column(Float)  # e.g., 50.0
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON, default=dict)
