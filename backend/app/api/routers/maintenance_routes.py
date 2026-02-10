from fastapi import APIRouter, Depends, HTTPException
from datetime import date, timedelta
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.maintenance_task import MaintenanceTask
from app.models.inventory_item import InventoryItem
from app.models.vendor import Vendor
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

ALLOWED_STATUSES = {"OPEN", "IN_PROGRESS", "BLOCKED", "CLOSED"}
ALLOWED_TYPES = {"EVENT", "INVENTORY", "VENDOR", "OTHER"}

@router.post("/", response_model=MaintenanceOut)
def create_task(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.status and payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")

    if payload.task_type and payload.task_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid task_type")

    if payload.inventory_item_id is not None:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == payload.inventory_item_id,
            InventoryItem.workspace_id == current_user.workspace_id
        ).first()

        if not item:
            raise HTTPException(status_code=400, detail="Invalid inventory_item_id")

    if payload.vendor_id is not None:
        vendor = db.query(Vendor).filter(
            Vendor.id == payload.vendor_id,
            Vendor.workspace_id == current_user.workspace_id
        ).first()

        if not vendor:
            raise HTTPException(status_code=400, detail="Invalid vendor_id")

    status = payload.status or "OPEN"
    task_type = payload.task_type
    if not task_type:
        if payload.inventory_item_id is not None:
            task_type = "INVENTORY"
        elif payload.vendor_id is not None:
            task_type = "VENDOR"
        elif payload.event_name:
            task_type = "EVENT"
        else:
            task_type = "OTHER"

    task = MaintenanceTask(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        inventory_item_id=payload.inventory_item_id,
        vendor_id=payload.vendor_id,
        event_name=payload.event_name,
        title=payload.title,
        due_date=payload.due_date,
        status=status,
        task_type=task_type,
        is_high_priority=payload.is_high_priority,
        notes=payload.notes,
    )
    if status == "CLOSED":
        task.completed_at = datetime.utcnow()
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/", response_model=List[MaintenanceOut])
def list_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(MaintenanceTask).filter(
        MaintenanceTask.workspace_id == current_user.workspace_id
    ).all()

@router.get("/upcoming", response_model=List[MaintenanceOut])
def upcoming_tasks(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
   
    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="days must be between 1 and 365")

    start_date = date.today()
    end_date = start_date + timedelta(days=days)

    tasks = (
        db.query(MaintenanceTask)
        .filter(MaintenanceTask.workspace_id == current_user.workspace_id)
        .filter(MaintenanceTask.status.in_(["OPEN", "IN_PROGRESS", "BLOCKED"]))
        .filter(MaintenanceTask.due_date != None)  
        .filter(MaintenanceTask.due_date >= start_date)
        .filter(MaintenanceTask.due_date <= end_date)
        .order_by(MaintenanceTask.due_date.asc())
        .all()
    )

    return tasks

@router.get("/{task_id}", response_model=MaintenanceOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(MaintenanceTask).filter(
        MaintenanceTask.id == task_id,
        MaintenanceTask.workspace_id == current_user.workspace_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task

@router.put("/{task_id}", response_model=MaintenanceOut)
def update_task(
    task_id: int,
    payload: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(MaintenanceTask).filter(
        MaintenanceTask.id == task_id,
        MaintenanceTask.workspace_id == current_user.workspace_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.inventory_item_id is not None:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == payload.inventory_item_id,
            InventoryItem.workspace_id == current_user.workspace_id
        ).first()
        if not item:
            raise HTTPException(status_code=400, detail="Invalid inventory_item_id")
        task.inventory_item_id = payload.inventory_item_id
    if payload.vendor_id is not None:
        vendor = db.query(Vendor).filter(
            Vendor.id == payload.vendor_id,
            Vendor.workspace_id == current_user.workspace_id
        ).first()
        if not vendor:
            raise HTTPException(status_code=400, detail="Invalid vendor_id")
        task.vendor_id = payload.vendor_id
    if payload.event_name is not None:
        task.event_name = payload.event_name
    if payload.notes is not None:
        task.notes = payload.notes
    if payload.is_high_priority is not None:
        task.is_high_priority = payload.is_high_priority
    if payload.task_type is not None:
        if payload.task_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Invalid task_type")
        task.task_type = payload.task_type
    if payload.status is not None:
        if payload.status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        task.status = payload.status
        if payload.status == "CLOSED":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(MaintenanceTask).filter(
        MaintenanceTask.id == task_id,
        MaintenanceTask.workspace_id == current_user.workspace_id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

    
