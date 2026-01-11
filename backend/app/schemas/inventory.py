from pydantic import BaseModel, ConfigDict
from typing import Optional

class InventoryCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    quantity: int = 0
    reorder_threshold: int = 0
    vendor_id: Optional[int] = None

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    quantity: Optional[int] = None
    reorder_threshold: Optional[int] = None
    vendor_id: Optional[int] = None  

class InventoryOut(BaseModel):
    id: int
    name: str
    sku: Optional[str]
    quantity: int
    reorder_threshold: int
    vendor_id: Optional[int]
    is_low_stock: bool  

    model_config = ConfigDict(from_attributes=True) 
