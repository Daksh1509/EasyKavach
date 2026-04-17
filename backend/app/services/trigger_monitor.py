import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.trigger_event import TriggerEvent
from app.integrations import get_current_weather, get_temperature_forecast, get_air_quality, check_civic_alerts
from app.models.worker import Zone

# Thresholds from README
HEAVY_RAIN_THRESHOLD = 50.0 # mm/h
EXTREME_HEAT_THRESHOLD = 42.0 # degrees C
HAZARDOUS_AQI_THRESHOLD = 300.0 # Standard AQI

async def monitor_zone_triggers(db: Session, zone: Zone) -> List[TriggerEvent]:
    triggered_events = []
    
    # 1. Heavy Rainfall
    weather = await get_current_weather(zone.latitude, zone.longitude)
    rain_1h = weather.get("rain", {}).get("1h", 0.0)
    if rain_1h > HEAVY_RAIN_THRESHOLD:
        event = TriggerEvent(
            trigger_type="heavy_rain",
            zone_id=zone.id,
            raw_value=rain_1h,
            threshold=HEAVY_RAIN_THRESHOLD,
            severity="high" if rain_1h > 80 else "medium",
            metadata_json={"weather": weather}
        )
        triggered_events.append(event)

    # 2. Extreme Heat
    heat = await get_temperature_forecast(zone.latitude, zone.longitude)
    current_temp = heat.get("current", {}).get("temperature_2m", 25.0)
    if current_temp > EXTREME_HEAT_THRESHOLD:
        event = TriggerEvent(
            trigger_type="extreme_heat",
            zone_id=zone.id,
            raw_value=current_temp,
            threshold=EXTREME_HEAT_THRESHOLD,
            severity="high" if current_temp > 45 else "medium",
            metadata_json={"heat": heat}
        )
        triggered_events.append(event)

    # 3. Hazardous AQI
    air = await get_air_quality(zone.latitude, zone.longitude)
    # Map OWM AQI 1-5 to standard numbers (simplified)
    # In practice we should use components PM2.5 etc.
    owm_aqi = air.get("list", [{}])[0].get("main", {}).get("aqi", 1)
    simulated_aqi = owm_aqi * 75.0 # Scaling 1-5 to 0-400 range roughly
    if simulated_aqi > HAZARDOUS_AQI_THRESHOLD:
        event = TriggerEvent(
            trigger_type="hazardous_aqi",
            zone_id=zone.id,
            raw_value=simulated_aqi,
            threshold=HAZARDOUS_AQI_THRESHOLD,
            severity="high" if simulated_aqi > 400 else "medium",
            metadata_json={"air": air}
        )
        triggered_events.append(event)

    # 4. Flood (Calculated from rain + elevation)
    # Simple logic: High rain + low elevation = flood
    if rain_1h > 40 and zone.elevation_m < 5.0:
        event = TriggerEvent(
            trigger_type="flood",
            zone_id=zone.id,
            raw_value=rain_1h,
            threshold=40.0,
            severity="high",
            metadata_json={"reason": "Low elevation combined with heavy rain"}
        )
        triggered_events.append(event)

    # 5. Civic Disruption
    alerts = await check_civic_alerts(zone.id)
    if alerts:
        event = TriggerEvent(
            trigger_type="civic_disruption",
            zone_id=zone.id,
            severity="high",
            metadata_json={"alerts": alerts}
        )
        triggered_events.append(event)

    # Save to DB
    for event in triggered_events:
        db.add(event)
    
    if triggered_events:
        db.commit()
        # After triggering, we would normally notify the claim processor
        # but the processor usually runs on a schedule against active events
        
    return triggered_events
