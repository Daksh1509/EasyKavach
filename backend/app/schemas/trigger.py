from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class TriggerEventBase(BaseModel):
    trigger_type: str
    zone_id: str
    severity: str = "medium"
    raw_value: Optional[float] = None
    threshold: Optional[float] = None
    is_active: bool = True
    metadata_json: Dict[str, Any] = {}

class TriggerEventCreate(TriggerEventBase):
    started_at: datetime = Field(default_factory=datetime.utcnow)

class TriggerEvent(TriggerEventBase):
    id: str
    started_at: datetime
    ended_at: Optional[datetime] = None

    class Config:
        from_attributes = True
