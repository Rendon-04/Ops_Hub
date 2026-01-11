from pydantic import BaseModel, ConfigDict
from typing import Optional

class VendorCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

class VendorOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]

    model_config = ConfigDict(from_attributes=True) 
