import enum
from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
import uuid
from datetime import datetime
from app.core.database import Base

class FraudSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class FraudFlag(Base):
    __tablename__ = "fraud_flags"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False)
    signal_type = Column(String, nullable=False)  # e.g., "pre_trigger_online"
    description = Column(String)
    severity = Column(Enum(FraudSeverity), default=FraudSeverity.MEDIUM)
    created_at = Column(DateTime, default=datetime.utcnow)
