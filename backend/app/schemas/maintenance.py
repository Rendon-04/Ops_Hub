from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

class MaintenanceCreate(BaseModel):
    title: str
    due_date: Optional[date] = None
    task_type: Optional[str] = None
    status: Optional[str] = None
    is_high_priority: bool = False
    inventory_item_id: Optional[int] = None
    vendor_id: Optional[int] = None
    event_name: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    task_type: Optional[str] = None
    status: Optional[str] = None 
    is_high_priority: Optional[bool] = None
    inventory_item_id: Optional[int] = None
    vendor_id: Optional[int] = None
    event_name: Optional[str] = None
    notes: Optional[str] = None

class MaintenanceOut(BaseModel):
    id: int
    title: str
    due_date: Optional[date]
    status: str
    task_type: str
    is_high_priority: bool
    inventory_item_id: Optional[int]
    vendor_id: Optional[int]
    event_name: Optional[str]
    notes: Optional[str]

    model_config = ConfigDict(from_attributes=True) 
