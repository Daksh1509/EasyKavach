import enum
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Enum
import uuid
from datetime import datetime
from app.core.database import Base

class PayoutStatus(str, enum.Enum):
    INITIATED = "initiated"
    COMPLETED = "completed"
    FAILED = "failed"

class PayoutChannel(str, enum.Enum):
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    WALLET = "wallet"

class Payout(Base):
    __tablename__ = "payouts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False)
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False)
    amount = Column(Float, nullable=False)
    channel = Column(Enum(PayoutChannel), default=PayoutChannel.UPI)
    transaction_id = Column(String, unique=True, nullable=False)
    status = Column(Enum(PayoutStatus), default=PayoutStatus.INITIATED)
    created_at = Column(DateTime, default=datetime.utcnow)
