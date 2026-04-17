from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.payout import Payout
from app.schemas.payout import Payout as PayoutSchema
from app.services.payout_processor import process_instant_payout

router = APIRouter()

@router.get("/", response_model=List[PayoutSchema])
def list_payouts(db: Session = Depends(get_db)):
    return db.query(Payout).order_by(Payout.created_at.desc()).all()

@router.post("/{claim_id}/process", response_model=PayoutSchema)
def trigger_payout(claim_id: str, db: Session = Depends(get_db)):
    payout = process_instant_payout(db, claim_id)
    if not payout:
        raise HTTPException(status_code=400, detail="Claim cannot be paid (check if approved)")
    return payout

@router.get("/worker/{worker_id}", response_model=List[PayoutSchema])
def get_worker_payouts(worker_id: str, db: Session = Depends(get_db)):
    return db.query(Payout).filter(Payout.worker_id == worker_id).all()
