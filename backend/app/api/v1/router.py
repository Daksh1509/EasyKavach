from fastapi import APIRouter
from app.api.v1.endpoints import (
    workers,
    policies,
    triggers,
    claims,
    payouts,
    analytics,
    civic_alerts
)

api_router = APIRouter()

api_router.include_router(workers.router, prefix="/workers", tags=["workers"])
api_router.include_router(policies.router, prefix="/policies", tags=["policies"])
api_router.include_router(triggers.router, prefix="/triggers", tags=["triggers"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(payouts.router, prefix="/payouts", tags=["payouts"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(civic_alerts.router, prefix="/civic-alerts", tags=["civic-alerts"])
