from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from app.models.worker import AreaType

class ZoneBase(BaseModel):
    id: str
    name: str
    city: str
    latitude: float
    longitude: float
    elevation_m: float = 0.0
    flood_prone: bool = False
    base_risk_score: float = 0.5
    footfall_score: float = 0.5
    historical_order_density: float = 0.5
    default_area_type: Optional[AreaType] = None
    default_warehouse_distance_km: Optional[float] = None
    
    # Phase 3 Fields
    pincode: Optional[str] = None
    dark_store_radius_ring: Optional[str] = "0-2km"

class ZoneCreate(ZoneBase):
    pass

class Zone(ZoneBase):
    class Config:
        from_attributes = True

class WorkerBase(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    pancard: Optional[str] = None
    aadhaar: Optional[str] = None
    upi_id: str = ""
    zone_id: str
    area_type: AreaType = AreaType.COMMERCIAL
    warehouse_distance_km: float = 1.0
    platform_type: str = "Blinkit"
    shifts: List[str] = []

class WorkerCreate(WorkerBase):
    email: str
    pancard: str
    aadhaar: str

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    pancard: Optional[str] = None
    aadhaar: Optional[str] = None
    upi_id: Optional[str] = None
    zone_id: Optional[str] = None
    area_type: Optional[AreaType] = None
    warehouse_distance_km: Optional[float] = None
    platform_type: Optional[str] = None
    is_online: Optional[bool] = None
    shifts: Optional[List[str]] = None

class Worker(WorkerBase):
    id: str
    is_online: bool
    registered_at: datetime
    last_active_at: datetime
    
    # Phase 3 Profile
    reliability_score: float = 0.8
    avg_daily_earnings: float = 500.0
    shift_completion_rate: float = 0.9
    past_shifts_history: List[dict] = []

    class Config:
        from_attributes = True
