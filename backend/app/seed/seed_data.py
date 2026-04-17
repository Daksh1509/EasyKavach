import json
import os
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.worker import Zone, Worker, AreaType
from app.models.policy import Policy, PolicyStatus
from datetime import datetime, timedelta
import uuid

def seed_db():
    db = SessionLocal()
    
    # 0. Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Clear existing (Dropping for schema updates)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    # 2. Add Zones
    zones_path = os.path.join(os.path.dirname(__file__), "zones.json")
    with open(zones_path, "r") as f:
        zones_data = json.load(f)
        for z in zones_data:
            if not db.query(Zone).filter(Zone.id == z["id"]).first():
                db_zone = Zone(**z)
                db.add(db_zone)
    
    db.commit()
    print("Zones seeded.")

    # 3. Add Mock Workers
    mock_workers = [
        {"name": "Ravi Kumar",    "phone": "9876543210", "upi_id": "ravi@upi",   "zone_id": "koramangala_blr",        "area_type": AreaType.COMMERCIAL,   "platform_type": "Blinkit",  "reliability_score": 0.92, "avg_daily_earnings": 620.0, "shift_completion_rate": 0.95},
        {"name": "Suresh Raina",  "phone": "9876543211", "upi_id": "suresh@upi", "zone_id": "velachery_chn",          "area_type": AreaType.RESIDENTIAL,  "platform_type": "Swiggy",   "reliability_score": 0.75, "avg_daily_earnings": 380.0, "shift_completion_rate": 0.80},
        {"name": "Amit Sharma",   "phone": "9876543212", "upi_id": "amit@upi",   "zone_id": "cp_delhi",               "area_type": AreaType.COMMERCIAL,   "platform_type": "Blinkit",  "reliability_score": 0.88, "avg_daily_earnings": 550.0, "shift_completion_rate": 0.91},
        {"name": "Vijay Varma",   "phone": "9876543213", "upi_id": "vijay@upi",  "zone_id": "bandra_mumbai",          "area_type": AreaType.COLLEGE,      "platform_type": "Zepto",    "reliability_score": 0.65, "avg_daily_earnings": 310.0, "shift_completion_rate": 0.70},
        {"name": "Priya Singh",   "phone": "9876543214", "upi_id": "priya@upi",  "zone_id": "indiranagar_blr",        "area_type": AreaType.COMMERCIAL,   "platform_type": "Blinkit",  "reliability_score": 0.95, "avg_daily_earnings": 680.0, "shift_completion_rate": 0.97},
        # Phase 3: Workers in radius-ring sub-zones to demonstrate granular zone differentiation
        {"name": "Deepak Nair",   "phone": "9876543215", "upi_id": "deepak@upi", "zone_id": "koramangala_blr_ring_b", "area_type": AreaType.COMMERCIAL,   "platform_type": "Blinkit",  "reliability_score": 0.80, "avg_daily_earnings": 480.0, "shift_completion_rate": 0.85},
        {"name": "Meena Pillai",  "phone": "9876543216", "upi_id": "meena@upi",  "zone_id": "koramangala_blr_ring_c", "area_type": AreaType.RESIDENTIAL,  "platform_type": "Zepto",    "reliability_score": 0.70, "avg_daily_earnings": 350.0, "shift_completion_rate": 0.75},
        {"name": "Arjun Reddy",   "phone": "9876543217", "upi_id": "arjun@upi",  "zone_id": "bandra_mumbai_ring_a",   "area_type": AreaType.COMMERCIAL,   "platform_type": "Blinkit",  "reliability_score": 0.90, "avg_daily_earnings": 600.0, "shift_completion_rate": 0.93},
    ]

    for w in mock_workers:
        existing = db.query(Worker).filter(Worker.phone == w["phone"]).first()
        if not existing:
            # Phase 3: Simulated worker shift history (individual behavioral analysis)
            base_earnings = w.get("avg_daily_earnings", 480.0)
            mock_history = [
                {
                    "date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"),
                    "shift": "evening",
                    "earnings": round(base_earnings * (0.85 + (i % 3) * 0.10), 2),
                    "completed": i % 5 != 0,  # ~80% completion rate in history
                    "disruption": i == 2,  # one disruption event in history
                }
                for i in range(1, 6)
            ]
            
            db_worker = Worker(
                **{k: v for k, v in w.items() if k not in ("reliability_score", "avg_daily_earnings", "shift_completion_rate")},
                warehouse_distance_km=1.2,
                is_online=True,
                shifts=["evening", "night"],
                reliability_score=w.get("reliability_score", 0.85),
                avg_daily_earnings=w.get("avg_daily_earnings", 480.0),
                shift_completion_rate=w.get("shift_completion_rate", 0.92),
                past_shifts_history=mock_history
            )
            db.add(db_worker)
            db.flush() # To get ID

            # Create an active policy for them — premium reflects behavioral score
            from app.services.premium_calculator import build_policy_quote
            zone_obj = db.query(Zone).filter(Zone.id == w["zone_id"]).first()
            quote = build_policy_quote(
                shifts=["evening", "night"],
                area_type=w["area_type"],
                zone=zone_obj,
                warehouse_distance_km=1.2,
                platform_type=w["platform_type"],
                reliability_score=w.get("reliability_score", 0.85),
                shift_completion_rate=w.get("shift_completion_rate", 0.92),
            )
            start = datetime.utcnow().date()
            policy = Policy(
                worker_id=db_worker.id,
                week_start=start,
                week_end=start + timedelta(days=7),
                premium_amount=quote["premium_amount"],
                expected_weekly_earning=quote["expected_weekly_earning"],
                expected_weekly_loss=quote["expected_weekly_loss"],
                risk_score=quote["risk_score"],
                status=PolicyStatus.ACTIVE
            )
            db.add(policy)

    db.commit()
    print("Mock workers and policies seeded.")
    db.close()

if __name__ == "__main__":
    seed_db()
