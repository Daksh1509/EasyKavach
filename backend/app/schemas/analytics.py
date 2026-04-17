from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class WorkerAnalytics(BaseModel):
    worker_id: str
    earnings_protected: float
    active_policy_id: Optional[str] = None
    total_claims: int
    recent_claims: List[Dict[str, Any]]

    # Predicted Objectives (Algorithm Results)
    expected_shift_earning: float
    expected_hourly_wage: float
    predicted_disruption_loss: float
    predicted_risk_payout_estimate: float

    # Phase 3 Fields
    reliability_score: float = 0.8
    shift_completion_rate: float = 0.9
    past_shifts_history: List[Dict[str, Any]] = []

    # Feature #2: ML Shift Engine breakdown
    shift_engine_breakdown: Optional[Dict[str, Any]] = None

    # Feature #3: Policy activation dashboard
    policy_dashboard: Optional[Dict[str, Any]] = None

    # Feature #10: Cash payout breakdown
    cash_payout_breakdown: Optional[Dict[str, Any]] = None
    recent_payouts: Optional[List[Dict[str, Any]]] = None


class InsurerOverview(BaseModel):
    total_workers: int
    total_payouts_amount: float
    active_policies_count: int
    loss_ratio: float
    fraud_rate: float
    claims_by_type: Dict[str, int]
    # Feature #11 additions
    total_premium_collected: Optional[float] = None
    total_claims_count: Optional[int] = None
    total_payouts_count: Optional[int] = None
    fraud_claims_blocked: Optional[int] = None
    top_trigger: Optional[str] = None
    top_trigger_pct: Optional[float] = None
    avg_claim_processing_seconds: Optional[float] = None


class ZoneRiskHeatmap(BaseModel):
    zone_id: str
    zone_name: str
    risk_score: float
    active_disruptions_count: int
    total_claims_count: int
    latitude: float
    longitude: float
    pincode: Optional[str] = None
    flood_prone: Optional[bool] = None
    risk_label: Optional[str] = None


class AnalyticsOverview(BaseModel):
    insurer_overview: InsurerOverview
    zone_heatmaps: List[ZoneRiskHeatmap]
