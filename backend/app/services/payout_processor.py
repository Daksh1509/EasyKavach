from sqlalchemy.orm import Session
from app.models.claim import Claim, ClaimStatus
from app.models.payout import Payout, PayoutStatus, PayoutChannel
import uuid
from datetime import datetime

def mock_razorpay_transfer(amount: float, upi_id: str) -> dict:
    """
    Phase 3: Instant Payout via Razorpay Sandbox
    Simulates a Razorpay UPI route transfer.
    """
    import random
    
    # Simulate API latency (sandbox)
    # time.sleep(0.5) 
    
    # 99% success rate in sandbox
    if random.random() > 0.01:
        txn_id = f"pay_{uuid.uuid4().hex[:14]}"
        return {"status": "processed", "id": txn_id, "channel": "upi"}
    else:
        return {"status": "failed", "id": None, "channel": "upi"}

def process_instant_payout(db: Session, claim_id: str) -> Payout:
    """
    Process payout for an approved claim via Razorpay Sandbox.
    """
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim or claim.status != ClaimStatus.AUTO_APPROVED:
        return None
        
    worker_upi = getattr(claim.worker, 'upi_id', 'mock@upi') if hasattr(claim, 'worker') else 'mock@upi'
    
    # 1. Dispatch Payment via Razorpay Simulator
    rzp_response = mock_razorpay_transfer(claim.adjusted_payout, worker_upi)
    
    if rzp_response["status"] == "failed":
        print(f"Razorpay transfer failed for claim {claim_id}")
        return None

    # 2. Create Payout Record
    payout = Payout(
        claim_id=claim.id,
        worker_id=claim.worker_id,
        amount=claim.adjusted_payout,
        channel=PayoutChannel.UPI,
        transaction_id=rzp_response["id"],
        status=PayoutStatus.COMPLETED 
    )
    
    # 3. Update Claim status
    claim.status = ClaimStatus.PAID
    
    db.add(payout)
    db.commit()
    db.refresh(payout)
    
    print(f"Payout of ₹{payout.amount} processed for claim {claim_id}")
    return payout
