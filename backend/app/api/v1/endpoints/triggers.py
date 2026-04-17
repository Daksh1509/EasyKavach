from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.trigger_event import TriggerEvent
from app.models.worker import Zone
from app.schemas.trigger import TriggerEvent as TriggerSchema
from app.services.trigger_monitor import monitor_zone_triggers, HEAVY_RAIN_THRESHOLD, EXTREME_HEAT_THRESHOLD, HAZARDOUS_AQI_THRESHOLD
from app.services.claim_processor import process_claims_for_trigger, SEVERITY_MULTIPLIERS

router = APIRouter()

@router.get("/check")
@router.post("/check-now")
async def check_triggers(zone_id: Optional[str] = None, db: Session = Depends(get_db)):
    if zone_id:
        zones = db.query(Zone).filter(Zone.id == zone_id).all()
    else:
        zones = db.query(Zone).all()

    all_events = []
    for zone in zones:
        events = await monitor_zone_triggers(db, zone)
        all_events.extend(events)

        for event in events:
            process_claims_for_trigger(db, event)

    return all_events

@router.get("/events", response_model=List[TriggerSchema])
def list_trigger_events(db: Session = Depends(get_db)):
    return db.query(TriggerEvent).order_by(TriggerEvent.started_at.desc()).all()

@router.get("/active", response_model=List[TriggerSchema])
def list_active_triggers(db: Session = Depends(get_db)):
    return db.query(TriggerEvent).filter(TriggerEvent.is_active == True).all()


@router.get("/status/{zone_id}")
async def zone_trigger_status(zone_id: str, db: Session = Depends(get_db)):
    """
    Feature #4: Real-Time Trigger Monitoring Dashboard
    Returns live status of all 5 trigger monitors for a zone with current readings vs thresholds.
    """
    from app.integrations import get_current_weather, get_temperature_forecast, get_air_quality, check_civic_alerts
    from datetime import datetime, timezone

    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zone not found")

    # Fetch live data
    weather = await get_current_weather(zone.latitude, zone.longitude)
    heat = await get_temperature_forecast(zone.latitude, zone.longitude)
    air = await get_air_quality(zone.latitude, zone.longitude)
    alerts = await check_civic_alerts(zone.id)

    rain_1h = weather.get("rain", {}).get("1h", 0.0)
    current_temp = heat.get("current", {}).get("temperature_2m", 25.0)
    owm_aqi = air.get("list", [{}])[0].get("main", {}).get("aqi", 1)
    simulated_aqi = owm_aqi * 75.0
    road_score = round(max(0.0, min(1.0, 1.0 - (zone.base_risk_score * 0.35))), 2)
    flood_alert = rain_1h > 40 and zone.elevation_m < 5.0

    monitors = [
        {
            "name": "Heavy Rainfall Monitor",
            "status": "ALERT" if rain_1h > HEAVY_RAIN_THRESHOLD else "Normal",
            "current_value": round(rain_1h, 1),
            "unit": "mm/hr",
            "threshold": HEAVY_RAIN_THRESHOLD,
            "alert": rain_1h > HEAVY_RAIN_THRESHOLD,
        },
        {
            "name": "Extreme Heat Monitor",
            "status": "ALERT" if current_temp > EXTREME_HEAT_THRESHOLD else "Normal",
            "current_value": round(current_temp, 1),
            "unit": "°C",
            "threshold": EXTREME_HEAT_THRESHOLD,
            "alert": current_temp > EXTREME_HEAT_THRESHOLD,
        },
        {
            "name": "AQI Hazard Monitor",
            "status": "ALERT" if simulated_aqi > HAZARDOUS_AQI_THRESHOLD else "Normal",
            "current_value": round(simulated_aqi, 0),
            "unit": "AQI",
            "threshold": HAZARDOUS_AQI_THRESHOLD,
            "alert": simulated_aqi > HAZARDOUS_AQI_THRESHOLD,
        },
        {
            "name": "Flood / Road Block",
            "status": "ALERT" if flood_alert else "Normal",
            "current_value": road_score,
            "unit": "road_score",
            "threshold": 0.2,
            "alert": flood_alert,
            "note": "Zone affected" if flood_alert else "No flood risk",
        },
        {
            "name": "Civic Disruption Monitor",
            "status": "ALERT" if alerts else "Normal",
            "current_value": len(alerts) if alerts else 0,
            "unit": "active_alerts",
            "threshold": 1,
            "alert": bool(alerts),
            "note": str(alerts[0]) if alerts else "No active curfew/bandh",
        },
    ]

    active_alerts = [m for m in monitors if m["alert"]]
    # IST = UTC+5:30
    ist_now = datetime.now(timezone.utc).strftime("%I:%M %p UTC")  # fallback without pytz

    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "pincode": zone.pincode,
        "last_checked": ist_now,
        "active_alert_count": len(active_alerts),
        "monitors": monitors,
    }


@router.get("/verification/{zone_id}")
async def multi_signal_verification(zone_id: str, db: Session = Depends(get_db)):
    """
    Feature #6: Multi-Signal Event Verification Engine
    For mass claim events, runs 4-layer verification and returns confidence score.
    """
    from app.models.claim import Claim
    from app.models.worker import Worker
    from app.integrations import get_current_weather, check_civic_alerts
    from datetime import datetime, timedelta

    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Zone not found")

    # Claims in last 30 mins
    cutoff = datetime.utcnow() - timedelta(minutes=30)
    recent_claims = db.query(Claim).join(Worker).filter(
        Worker.zone_id == zone_id,
        Claim.created_at >= cutoff
    ).count()

    # Layer 1: API cross-check
    weather = await get_current_weather(zone.latitude, zone.longitude)
    rain_1h = weather.get("rain", {}).get("1h", 0.0)
    alerts = await check_civic_alerts(zone.id)
    weather_confirmed = rain_1h > HEAVY_RAIN_THRESHOLD
    civic_conflict = bool(alerts)

    # Layer 2: Traffic signal (simulated — road score proxy)
    avg_speed_kmh = round(35 * max(0.1, 1.0 - zone.base_risk_score), 1)
    traffic_ok = avg_speed_kmh < 20

    # Layer 3: Crowd verification (simulated)
    workers_in_zone = db.query(Worker).filter(Worker.zone_id == zone_id).count()
    polled = min(workers_in_zone, 24)
    confirming = round(polled * 0.875)
    crowd_pct = round((confirming / polled * 100), 1) if polled > 0 else 0.0
    crowd_ok = crowd_pct >= 70

    # Layer 4: Claim density pattern (gradual vs spike)
    all_claims_today = db.query(Claim).join(Worker).filter(
        Worker.zone_id == zone_id,
        Claim.created_at >= datetime.utcnow() - timedelta(hours=24)
    ).count()
    claim_growth_rate = "Gradual" if recent_claims <= (all_claims_today * 0.5 + 1) else "Spike"
    density_ok = claim_growth_rate == "Gradual"

    # Confidence score
    signals_passed = sum([weather_confirmed, not civic_conflict, traffic_ok, crowd_ok, density_ok])
    confidence_score = round((signals_passed / 5) * 100, 1)
    if confidence_score >= 80:
        confidence_label = "HIGH"
        decision = "AUTO-APPROVE all eligible claims"
    elif confidence_score >= 50:
        confidence_label = "MEDIUM"
        decision = "Spot-verify 20% of claims"
    else:
        confidence_label = "LOW"
        decision = "Hold for manual review"

    return {
        "zone_id": zone_id,
        "zone_name": zone.name,
        "pincode": zone.pincode,
        "claims_last_30_mins": recent_claims,
        "is_mass_event": recent_claims >= 2,
        "verification_layers": {
            "layer_1_api_crosscheck": {
                "weather_api": {"confirmed": weather_confirmed, "value": f"{round(rain_1h, 1)}mm/hr"},
                "civic_api": {"conflict": civic_conflict, "note": "No conflicting event" if not civic_conflict else "Conflict detected"},
            },
            "layer_2_traffic": {
                "avg_speed_kmh": avg_speed_kmh,
                "normal_speed_kmh": 35,
                "confirmed": traffic_ok,
            },
            "layer_3_crowd": {
                "workers_polled": polled,
                "confirming": confirming,
                "confirmation_pct": crowd_pct,
                "confirmed": crowd_ok,
            },
            "layer_4_claim_density": {
                "growth_rate": claim_growth_rate,
                "confirmed": density_ok,
            },
        },
        "confidence_score_pct": confidence_score,
        "confidence_label": confidence_label,
        "decision": decision,
    }


@router.get("/concurrent/{worker_id}")
def concurrent_disruption_status(worker_id: str, db: Session = Depends(get_db)):
    """
    Feature #9: Concurrent Disruption Handler
    Shows active concurrent triggers for a worker and the conflict resolution result.
    """
    from app.models.claim import Claim
    from app.models.worker import Worker

    worker = db.query(Worker).filter(Worker.id == worker_id).first()
    if not worker:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Worker not found")

    # Active concurrent claims (ongoing trigger events)
    concurrent_claims = (
        db.query(Claim)
        .join(TriggerEvent)
        .filter(
            Claim.worker_id == worker_id,
            TriggerEvent.zone_id == worker.zone_id,
            TriggerEvent.ended_at == None,
        )
        .all()
    )

    if not concurrent_claims:
        return {
            "worker_id": worker_id,
            "concurrent_disruptions": [],
            "conflict_resolution_policy": "highest_severity_wins",
            "note": "No concurrent disruptions active",
        }

    triggers_detail = []
    for c in concurrent_claims:
        te = db.query(TriggerEvent).filter(TriggerEvent.id == c.trigger_event_id).first()
        triggers_detail.append({
            "trigger_type": te.trigger_type if te else "unknown",
            "severity_multiplier": c.severity_multiplier,
            "claim_id": c.id,
        })

    # Highest severity wins + supplemental bonus
    max_multiplier = max(c.severity_multiplier for c in concurrent_claims)
    secondary_count = sum(1 for c in concurrent_claims if c.severity_multiplier < max_multiplier)
    supplemental_bonus = round(secondary_count * 0.1, 2)
    final_multiplier = round(max_multiplier + supplemental_bonus, 2)

    # Example payout with final multiplier
    hourly_wage = concurrent_claims[0].hourly_wage if concurrent_claims else 0.0
    example_duration = 3.0
    example_payout = round(hourly_wage * example_duration * final_multiplier, 2)

    return {
        "worker_id": worker_id,
        "concurrent_disruptions": triggers_detail,
        "conflict_resolution_policy": "highest_severity_wins",
        "highest_severity_multiplier": max_multiplier,
        "secondary_triggers": secondary_count,
        "supplemental_bonus": supplemental_bonus,
        "final_applied_multiplier": final_multiplier,
        "example_payout_3hrs": example_payout,
        "example_formula": f"₹{hourly_wage} × {example_duration}hrs × {final_multiplier} = ₹{example_payout}",
    }
