from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.payout import PayoutStatus, PayoutChannel

class PayoutBase(BaseModel):
    claim_id: str
    worker_id: str
    amount: float
    channel: PayoutChannel = PayoutChannel.UPI
    transaction_id: str
    status: PayoutStatus = PayoutStatus.INITIATED

class PayoutCreate(PayoutBase):
    pass

class Payout(PayoutBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
