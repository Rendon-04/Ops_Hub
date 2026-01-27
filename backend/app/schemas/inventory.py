from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class InventoryCreate(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int = 0
    reorder_threshold: int = 0
    reorder_url: Optional[str] = None
    notes: Optional[str] = None
    vendor_id: Optional[int] = None

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[int] = None
    reorder_threshold: Optional[int] = None
    reorder_url: Optional[str] = None
    notes: Optional[str] = None
    vendor_id: Optional[int] = None  

class InventoryOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    quantity: int
    reorder_threshold: int
    reorder_url: Optional[str]
    notes: Optional[str]
    last_checked_at: Optional[datetime]
    vendor_id: Optional[int]
    is_low_stock: bool  
    status: str

    model_config = ConfigDict(from_attributes=True) 
