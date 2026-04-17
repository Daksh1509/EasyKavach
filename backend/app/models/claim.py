import enum
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum
import uuid
from datetime import datetime
from app.core.database import Base

class DisruptionType(str, enum.Enum):
    HEAVY_RAIN = "heavy_rain"
    EXTREME_HEAT = "extreme_heat"
    HAZARDOUS_AQI = "hazardous_aqi"
    FLOOD = "flood"
    CIVIC_DISRUPTION = "civic_disruption"

class ClaimStatus(str, enum.Enum):
    AUTO_APPROVED = "auto_approved"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"

class FraudResult(str, enum.Enum):
    PASSED = "passed"
    FLAGGED = "flagged"
    FAILED = "failed"

class Claim(Base):
    __tablename__ = "claims"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False)
    policy_id = Column(String, ForeignKey("policies.id"), nullable=False)
    trigger_event_id = Column(String, ForeignKey("trigger_events.id"), nullable=False)
    disruption_type = Column(Enum(DisruptionType), nullable=False)
    disruption_duration_hours = Column(Float, nullable=False)
    hourly_wage = Column(Float, nullable=False)
    severity_multiplier = Column(Float, default=1.0)
    base_loss = Column(Float, nullable=False)
    adjusted_payout = Column(Float, nullable=False)
    status = Column(Enum(ClaimStatus), default=ClaimStatus.PENDING_REVIEW)
    fraud_check_result = Column(Enum(FraudResult), default=FraudResult.PASSED)
    fraud_probability = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
