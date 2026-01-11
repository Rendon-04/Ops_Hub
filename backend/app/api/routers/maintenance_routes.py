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
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut

router = APIRouter(prefix="/maintenance", tags=["maintenance"])

@router.post("/", response_model=MaintenanceOut)
def create_task(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    item = db.query(InventoryItem).filter(
        InventoryItem.id == payload.inventory_item_id,
        InventoryItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=400, detail="Invalid inventory_item_id")

    task = MaintenanceTask(
        user_id=current_user.id,
        inventory_item_id=payload.inventory_item_id,
        title=payload.title,
        due_date=payload.due_date,
        status="PENDING"
    )
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
        MaintenanceTask.user_id == current_user.id
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
        .filter(MaintenanceTask.user_id == current_user.id)
        .filter(MaintenanceTask.status == "PENDING")
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
        MaintenanceTask.user_id == current_user.id
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
        MaintenanceTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.title is not None:
        task.title = payload.title
    if payload.due_date is not None:
        task.due_date = payload.due_date
    if payload.status is not None:
        if payload.status not in ["PENDING", "COMPLETED"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        task.status = payload.status
        if payload.status == "COMPLETED":
            task.completed_at = datetime.utcnow()

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
        MaintenanceTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

    
