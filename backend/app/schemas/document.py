from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


DOCUMENT_CATEGORIES = {"opening", "closing", "ups", "events", "business"}


class DocumentCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    is_pinned: Optional[bool] = False


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    is_pinned: Optional[bool] = None


class DocumentOut(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str]
    original_filename: str
    mime_type: str
    file_size: int
    is_pinned: bool
    uploaded_by_user_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
