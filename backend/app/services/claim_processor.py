from datetime import datetime
from typing import List
from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus
from app.models.policy import Policy, PolicyStatus
from app.models.worker import Worker, Zone
from app.models.trigger_event import TriggerEvent
from app.services.income_engine import calculate_expected_shift_earning, calculate_hourly_wage

# Severity Multipliers from README
SEVERITY_MULTIPLIERS = {
    "heavy_rain": 1.0,
    "extreme_heat": 0.8,
    "hazardous_aqi": 0.7,
    "flood": 1.3,
    "civic_disruption": 1.5
}

# Phase 3: Concurrent Disruption Policy — "Highest Severity Wins"
# When multiple disruptions are active simultaneously (e.g. heavy rain + curfew),
# only the highest-severity multiplier is applied. This prevents double-counting
# while still ensuring the worker is compensated at the worst-case rate.
# Rule: if current_severity <= max_existing_severity → skip (already covered).
CONCURRENT_DISRUPTION_POLICY = "highest_severity_wins"

def calculate_event_confidence(trigger_event: TriggerEvent) -> str:
    """
    Phase 3: Multi-Signal Event Verification
    Returns 'HIGH', 'MEDIUM', or 'LOW' based on API cross-checks and simulated social verification.
    """
    base_confidence = 0.8 if trigger_event.trigger_type in ["heavy_rain", "extreme_heat", "hazardous_aqi"] else 0.5
    # Simulated Phase 3 traffic and social proof feature (e.g. 90% workers say "Yes" deliveries stopped)
    social_proof_score = 0.9 
    
    final_score = (base_confidence + social_proof_score) / 2.0
    
    if final_score >= 0.8:
        return 'HIGH'
    elif final_score >= 0.5:
        return 'MEDIUM'
    return 'LOW'

def process_claims_for_trigger(db: Session, trigger_event: TriggerEvent):
    """
    Zero-Touch Claim Initiation Engine: 4 checks.
    """
    # 1. Zone Match is implicit as we get only workers in the zone
    workers_in_zone = db.query(Worker).filter(Worker.zone_id == trigger_event.zone_id).all()

    # Phase 3: Mass Claim Verification Check
    MASS_CLAIM_THRESHOLD = 2 # Set artificially low to 2 for demonstration (Production: 50+)
    is_mass_event = len(workers_in_zone) >= MASS_CLAIM_THRESHOLD
    event_confidence = 'HIGH' # Default
    if is_mass_event:
        event_confidence = calculate_event_confidence(trigger_event)


    for worker in workers_in_zone:
        # Check 2: Active Policy
        policy = db.query(Policy).filter(
            Policy.worker_id == worker.id,
            Policy.status == PolicyStatus.ACTIVE,
            Policy.week_start <= datetime.utcnow().date(),
            Policy.week_end >= datetime.utcnow().date()
        ).first()
        
        if not policy:
            continue
            
        # Check 3: Online Status (Simplified - mock online for now or check worker.is_online)
        # In Phase 1 we might assume they were working or check flag
        if not worker.is_online and not trigger_event.trigger_type == "civic_disruption":
            # Some events might prevent them from even going online
            continue

        # Check 4: Duplicate Check (No claim for same trigger and worker)
        existing = db.query(Claim).filter(
            Claim.worker_id == worker.id,
            Claim.trigger_event_id == trigger_event.id
        ).first()
        
        if existing:
            continue

        # Phase 3 - Compound Disruption Edge Case Handling: "Highest severity wins"
        # If the worker already has an active claim (status PAID/AUTO_APPROVED) for a DIFFERENT ongoing disruption,
        # we check the severity. We take the multiplier of the worst trigger only.
        concurrent_claims = db.query(Claim).join(TriggerEvent).filter(
            Claim.worker_id == worker.id,
            TriggerEvent.zone_id == trigger_event.zone_id,
            TriggerEvent.ended_at == None # meaning it's an ongoing disruption
        ).all()
        
        if concurrent_claims:
            max_existing_severity = max([c.severity_multiplier for c in concurrent_claims])
            current_severity = SEVERITY_MULTIPLIERS.get(trigger_event.trigger_type, 1.0)
            if current_severity <= max_existing_severity:
                # We skip payout for this trigger since an equal or worse disruption is already actively compensating them
                continue

        # Calculate Loss using detailed Algorithm Inputs
        duration = 2.0
        if trigger_event.ended_at:
            delta = trigger_event.ended_at - trigger_event.started_at
            duration = delta.total_seconds() / 3600.0

        # Get Zone data specifically for this worker
        zone = db.query(Zone).filter(Zone.id == worker.zone_id).first()

        # Predicted Objectives
        current_shift = worker.shifts[0] if worker.shifts else "evening"
        expected_earning = calculate_expected_shift_earning(
            current_shift, 
            worker.area_type,
            footfall_score=zone.footfall_score if zone else 0.5,
            historical_order_density=zone.historical_order_density if zone else 0.5,
            warehouse_distance_km=worker.warehouse_distance_km,
            platform_type=worker.platform_type,
            zone=zone
        )
        hourly_wage = calculate_hourly_wage(expected_earning)
        
        # 1. Disruption-Adjusted Loss
        disruption_adjusted_loss = hourly_wage * duration
        
        # 2. Risk-Adjusted Payout Estimate
        multiplier = SEVERITY_MULTIPLIERS.get(trigger_event.trigger_type, 1.0)
        risk_adjusted_payout = disruption_adjusted_loss * multiplier

        # Phase 3: Individual Behavioral Analysis — apply worker profile score.
        # A worker with high reliability and consistent shift history gets a
        # slightly higher payout (up to +10%) because their income loss is more
        # verifiable. Low-reliability workers are capped at a lower adjustment.
        reliability = getattr(worker, "reliability_score", 0.8) or 0.8
        shift_completion = getattr(worker, "shift_completion_rate", 0.9) or 0.9
        # Composite behavioral score (0.0 – 1.0)
        behavioral_score = round((reliability * 0.6) + (shift_completion * 0.4), 4)
        # Maps behavioral_score [0.5, 1.0] → payout_modifier [0.95, 1.10]
        behavioral_modifier = round(0.95 + (behavioral_score - 0.5) * 0.30, 4)
        behavioral_modifier = max(0.90, min(1.10, behavioral_modifier))
        risk_adjusted_payout = round(risk_adjusted_payout * behavioral_modifier, 2)

        # 3. Dynamic Claim Status Assignment (Phase 3 Mass handling)
        assigned_status = ClaimStatus.AUTO_APPROVED
        if is_mass_event:
            if event_confidence == 'LOW':
                assigned_status = ClaimStatus.PENDING_REVIEW
            elif event_confidence == 'MEDIUM':
                # Spot verify ~20% of claims using hash
                assigned_status = ClaimStatus.PENDING_REVIEW if hash(worker.id) % 5 == 0 else ClaimStatus.AUTO_APPROVED

        # Create Claim
        claim = Claim(
            worker_id=worker.id,
            policy_id=policy.id,
            trigger_event_id=trigger_event.id,
            disruption_type=trigger_event.trigger_type,
            disruption_duration_hours=duration,
            hourly_wage=hourly_wage,
            severity_multiplier=multiplier,
            base_loss=disruption_adjusted_loss, # Maps to disruption_adjusted_loss
            adjusted_payout=risk_adjusted_payout, # Maps to risk_adjusted_payout_estimate
            status=assigned_status
        )
        
        db.add(claim)
    
    db.commit()
