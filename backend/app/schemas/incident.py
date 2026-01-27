from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime, date


INCIDENT_TYPES = {
    "customer_issue",
    "safety_concern",
    "property_damage",
    "ups_dispute",
    "staff_incident",
    "other",
}

SEVERITIES = {"low", "medium", "high"}

STATUSES = {"open", "in_progress", "resolved"}


class IncidentCreate(BaseModel):
    title: str
    incident_type: str
    occurred_at: datetime
    description: str
    severity: str
    action_taken: str
    follow_up_needed: bool = False
    follow_up_owner: Optional[str] = None
    follow_up_due_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    status: str = "open"


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    incident_type: Optional[str] = None
    occurred_at: Optional[datetime] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    action_taken: Optional[str] = None
    follow_up_needed: Optional[bool] = None
    follow_up_owner: Optional[str] = None
    follow_up_due_date: Optional[date] = None
    follow_up_notes: Optional[str] = None
    status: Optional[str] = None


class IncidentOut(BaseModel):
    id: int
    title: str
    incident_type: str
    occurred_at: datetime
    description: str
    severity: str
    action_taken: str
    follow_up_needed: bool
    follow_up_owner: Optional[str]
    follow_up_due_date: Optional[date]
    follow_up_notes: Optional[str]
    status: str
    reported_by_user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentAttachmentOut(BaseModel):
    id: int
    incident_id: int
    file_name: str
    mime_type: str
    file_size: Optional[int]
    storage_key: str
    public_url: Optional[str]
    uploaded_by_user_id: int
    created_at: datetime
    view_url: Optional[str] = None
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
