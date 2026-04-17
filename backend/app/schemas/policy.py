from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from app.models.policy import PolicyStatus

class PolicyBase(BaseModel):
    worker_id: str
    week_start: date
    week_end: date
    premium_amount: float
    expected_weekly_earning: float
    expected_weekly_loss: float
    risk_score: float = 0.5
    status: PolicyStatus = PolicyStatus.ACTIVE

class PolicyCreate(PolicyBase):
    pass

class Policy(PolicyBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PolicyQuoteRequest(BaseModel):
    zone_id: str
    area_type: Optional[str] = None
    warehouse_distance_km: Optional[float] = None
    platform_type: str = "Blinkit"
    shifts: List[str] = Field(default_factory=lambda: ["evening"])


class ShiftForecast(BaseModel):
    shift: str
    expected_shift_earning: float
    expected_hourly_wage: float


class PolicyQuote(BaseModel):
    model_enabled: bool
    pricing_mode: str
    zone_id: Optional[str] = None
    zone_name: Optional[str] = None
    pincode: Optional[str] = None
    dark_store_radius_ring: Optional[str] = None
    risk_score: float
    disruption_probability: float
    selected_shifts: List[str]
    shift_forecasts: List[ShiftForecast]
    recommended_shift: str
    expected_daily_earning: float
    expected_weekly_earning: float
    expected_weekly_loss: float
    premium_amount: float
    base_premium_amount: Optional[float] = None
    behavioral_score: Optional[float] = None
    premium_modifier: Optional[float] = None
    hourly_income_floor: float
