from fastapi import APIRouter
router = APIRouter()

@router.get("/active")
def list_active_alerts():
    return []

# Placeholder for manual alert injection
@router.post("/create")
def create_mock_alert():
    return {"message": "Mock alert created"}
