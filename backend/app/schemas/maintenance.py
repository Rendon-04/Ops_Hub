from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date

class MaintenanceCreate(BaseModel):
    inventory_item_id: int
    title: str
    due_date: Optional[date] = None

class MaintenanceUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None 

class MaintenanceOut(BaseModel):
    id: int
    inventory_item_id: int
    title: str
    due_date: Optional[date]
    status: str

    model_config = ConfigDict(from_attributes=True) 
