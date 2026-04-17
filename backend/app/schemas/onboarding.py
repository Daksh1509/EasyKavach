from pydantic import BaseModel
from typing import Optional

from app.schemas.policy import Policy, PolicyQuote
from app.schemas.worker import Worker


class WorkerOnboardingResponse(BaseModel):
    worker: Worker
    policy: Policy
    quote: PolicyQuote
    # Phase 3: Onboarding summary fields (Feature #1)
    worker_id_display: Optional[str] = None       # e.g. "BLK_2847"
    risk_level: Optional[str] = None              # e.g. "High (40/100 zone score)"
    zone_display: Optional[str] = None            # e.g. "Koramangala, 560034 (Zone A — 0–1km)"
    policy_status_label: Optional[str] = None     # e.g. "Active"
    hourly_support_rate: Optional[float] = None   # hourly_income_floor from quote
