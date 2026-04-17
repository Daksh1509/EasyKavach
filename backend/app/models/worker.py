import enum
from sqlalchemy import Column, String, Float, Boolean, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.core.database import Base

class AreaType(str, enum.Enum):
    COMMERCIAL = "commercial"
    COLLEGE = "college"
    RESIDENTIAL = "residential"
    LOW_DENSITY = "low_density"

class Zone(Base):
    __tablename__ = "zones"
    
    id = Column(String, primary_key=True)  # e.g., "koramangala_blr"
    name = Column(String, nullable=False)
    city = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    elevation_m = Column(Float, default=0.0)
    flood_prone = Column(Boolean, default=False)
    base_risk_score = Column(Float, default=0.5)
    footfall_score = Column(Float, default=0.5) # Area Input (0 to 1)
    historical_order_density = Column(Float, default=0.5) # Area Input (0 to 1)

    # Phase 3: Granular Zone Definitions
    pincode = Column(String, nullable=True)
    dark_store_radius_ring = Column(String, nullable=True, default="0-2km") # e.g. "0-1km", "1-2km"

class Worker(Base):
    __tablename__ = "workers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False)
    email = Column(String, nullable=True)
    pancard = Column(String, nullable=True)
    aadhaar = Column(String, nullable=True)
    upi_id = Column(String, nullable=False, default="")
    zone_id = Column(String, ForeignKey("zones.id"))
    area_type = Column(Enum(AreaType), default=AreaType.COMMERCIAL)
    platform_type = Column(String, default="Blinkit") # e.g., "Blinkit", "Zepto", "Uber Eats"
    warehouse_distance_km = Column(Float, default=1.0)
    is_online = Column(Boolean, default=False)
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_active_at = Column(DateTime, default=datetime.utcnow)
    shifts = Column(JSON, default=list)  # e.g., ["morning", "evening"]
    
    # Phase 3: Individual Behavioral Analysis (Worker Profile Score)
    reliability_score = Column(Float, default=0.8)
    avg_daily_earnings = Column(Float, default=500.0)
    shift_completion_rate = Column(Float, default=0.9)
    past_shifts_history = Column(JSON, default=list) # Mock table of shifts
