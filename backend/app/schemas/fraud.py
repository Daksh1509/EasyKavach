from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.fraud_flag import FraudSeverity

class FraudFlagBase(BaseModel):
    claim_id: str
    signal_type: str
    description: Optional[str] = None
    severity: FraudSeverity = FraudSeverity.MEDIUM

class FraudFlagCreate(FraudFlagBase):
    pass

class FraudFlag(FraudFlagBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

class FraudSummary(BaseModel):
    claim_id: str
    probability: float
    decision: str  # "AUTO_APPROVED", "FLAG_FOR_REVIEW", "REJECTED"
    top_signals: List[str]
