import enum
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Date, Enum
import uuid
from datetime import datetime
from app.core.database import Base

class PolicyStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class Policy(Base):
    __tablename__ = "policies"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    premium_amount = Column(Float, nullable=False)
    expected_weekly_earning = Column(Float, nullable=False)
    expected_weekly_loss = Column(Float, nullable=False)
    risk_score = Column(Float, default=0.5)
    status = Column(Enum(PolicyStatus), default=PolicyStatus.ACTIVE)
    created_at = Column(DateTime, default=datetime.utcnow)
