from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.inventory_item import InventoryItem
from app.models.maintenance_task import MaintenanceTask
from app.schemas.dashboard import DashboardSummaryOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    total_items = db.query(InventoryItem).filter(
        InventoryItem.user_id == current_user.id
    ).count()

    low_stock_count = db.query(InventoryItem).filter(
        InventoryItem.user_id == current_user.id,
        InventoryItem.quantity <= InventoryItem.reorder_threshold
    ).count()

    open_tasks_count = db.query(MaintenanceTask).filter(
        MaintenanceTask.user_id == current_user.id,
        MaintenanceTask.status.in_(["OPEN", "IN_PROGRESS", "BLOCKED"])
    ).count()

    return {
        "total_items": total_items,
        "low_stock_count": low_stock_count,
        "open_tasks_count": open_tasks_count
    }
