from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date, datetime


class ShiftNoteUpsert(BaseModel):
    note_date: date
    shift_type: str
    content: str


class UpdatedBy(BaseModel):
    id: int
    email: str


class ShiftNoteEntry(BaseModel):
    content: str
    updated_at: datetime
    updated_by: Optional[UpdatedBy]


class ShiftNotesTodayOut(BaseModel):
    note_date: date
    date_label: str
    opening: Optional[ShiftNoteEntry]
    closing: Optional[ShiftNoteEntry]

    model_config = ConfigDict(from_attributes=True)
