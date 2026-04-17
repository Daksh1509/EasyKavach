from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.claim import DisruptionType, ClaimStatus, FraudResult

class ClaimBase(BaseModel):
    worker_id: str
    policy_id: str
    trigger_event_id: str
    disruption_type: DisruptionType
    disruption_duration_hours: float
    hourly_wage: float
    severity_multiplier: float = 1.0
    base_loss: float
    adjusted_payout: float
    status: ClaimStatus = ClaimStatus.PENDING_REVIEW
    fraud_check_result: FraudResult = FraudResult.PASSED
    fraud_probability: float = 0.0

class ClaimCreate(ClaimBase):
    pass

class ClaimUpdate(BaseModel):
    status: Optional[ClaimStatus] = None
    fraud_check_result: Optional[FraudResult] = None
    fraud_probability: Optional[float] = None
    reviewed_at: Optional[datetime] = None

class Claim(ClaimBase):
    id: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
