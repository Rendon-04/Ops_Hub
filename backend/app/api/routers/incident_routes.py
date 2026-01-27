from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pathlib import Path
import os
import uuid

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.incident import Incident
from app.models.incident_attachment import IncidentAttachment
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentOut,
    IncidentAttachmentOut,
    INCIDENT_TYPES,
    SEVERITIES,
    STATUSES,
)


incidents_router = APIRouter(prefix="/api/incidents", tags=["incidents"])
incident_attachments_router = APIRouter(prefix="/api/incident_attachments", tags=["incident_attachments"])
attachments_router = APIRouter(prefix="/api/attachments", tags=["attachments"])

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "text/plain",
}

BASE_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BASE_DIR / "uploads" / "incidents"


def validate_incident_payload(incident_type: Optional[str], severity: Optional[str], status_value: Optional[str]):
    if incident_type and incident_type not in INCIDENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid incident_type")
    if severity and severity not in SEVERITIES:
        raise HTTPException(status_code=400, detail="Invalid severity")
    if status_value and status_value not in STATUSES:
        raise HTTPException(status_code=400, detail="Invalid status")


def validate_follow_up(
    follow_up_needed: Optional[bool],
    follow_up_owner: Optional[str],
    follow_up_due_date,
):
    if follow_up_needed:
        if not follow_up_owner:
            raise HTTPException(status_code=400, detail="follow_up_owner is required")
        if not follow_up_due_date:
            raise HTTPException(status_code=400, detail="follow_up_due_date is required")


@incidents_router.post("/", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    validate_incident_payload(payload.incident_type, payload.severity, payload.status)
    validate_follow_up(payload.follow_up_needed, payload.follow_up_owner, payload.follow_up_due_date)

    incident = Incident(
        title=payload.title,
        incident_type=payload.incident_type,
        occurred_at=payload.occurred_at,
        description=payload.description,
        severity=payload.severity,
        action_taken=payload.action_taken,
        follow_up_needed=payload.follow_up_needed,
        follow_up_owner=payload.follow_up_owner,
        follow_up_due_date=payload.follow_up_due_date,
        follow_up_notes=payload.follow_up_notes,
        status=payload.status,
        reported_by_user_id=current_user.id,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


@incidents_router.get("/", response_model=List[IncidentOut])
def list_incidents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    incident_type: Optional[str] = Query(None, alias="type"),
    severity: Optional[str] = None,
    status_value: Optional[str] = Query(None, alias="status"),
    follow_up_needed: Optional[bool] = None,
    from_date: Optional[datetime] = Query(None, alias="from"),
    to_date: Optional[datetime] = Query(None, alias="to"),
):
    validate_incident_payload(incident_type, severity, status_value)

    query = db.query(Incident).filter(Incident.reported_by_user_id == current_user.id)

    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status_value:
        query = query.filter(Incident.status == status_value)
    if follow_up_needed is not None:
        query = query.filter(Incident.follow_up_needed == follow_up_needed)
    if from_date:
        query = query.filter(Incident.occurred_at >= from_date)
    if to_date:
        query = query.filter(Incident.occurred_at <= to_date)

    return query.order_by(Incident.occurred_at.desc()).all()


@incidents_router.get("/{incident_id}", response_model=IncidentOut)
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    return incident


@incidents_router.patch("/{incident_id}", response_model=IncidentOut)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    validate_incident_payload(payload.incident_type, payload.severity, payload.status)

    effective_follow_up_needed = (
        payload.follow_up_needed
        if payload.follow_up_needed is not None
        else incident.follow_up_needed
    )
    effective_owner = (
        payload.follow_up_owner
        if payload.follow_up_owner is not None
        else incident.follow_up_owner
    )
    effective_due = (
        payload.follow_up_due_date
        if payload.follow_up_due_date is not None
        else incident.follow_up_due_date
    )

    validate_follow_up(effective_follow_up_needed, effective_owner, effective_due)

    for field in [
        "title",
        "incident_type",
        "occurred_at",
        "description",
        "severity",
        "action_taken",
        "follow_up_needed",
        "follow_up_owner",
        "follow_up_due_date",
        "follow_up_notes",
        "status",
    ]:
        value = getattr(payload, field)
        if value is not None:
            setattr(incident, field, value)

    if payload.follow_up_needed is False:
        incident.follow_up_owner = None
        incident.follow_up_due_date = None
        incident.follow_up_notes = None

    db.commit()
    db.refresh(incident)
    return incident


@incidents_router.delete("/{incident_id}")
def delete_incident(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.delete(incident)
    db.commit()
    return {"message": "Incident deleted"}


@incidents_router.post("/{incident_id}/attachments", response_model=IncidentAttachmentOut, status_code=status.HTTP_201_CREATED)
def upload_attachment(
    incident_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    safe_name = os.path.basename(file.filename or "upload")
    unique_name = f"{uuid.uuid4().hex}_{safe_name}"
    target_dir = UPLOAD_DIR / str(incident_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / unique_name

    size = 0
    with target_path.open("wb") as out_file:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                out_file.close()
                target_path.unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="File too large")
            out_file.write(chunk)

    storage_key = str(target_path.relative_to(BASE_DIR))

    attachment = IncidentAttachment(
        incident_id=incident_id,
        file_name=safe_name,
        mime_type=file.content_type or "application/octet-stream",
        file_size=size,
        storage_key=storage_key,
        public_url=None,
        uploaded_by_user_id=current_user.id,
    )

    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    attachment.view_url = f"/api/attachments/{attachment.id}/view"
    attachment.download_url = f"/api/attachments/{attachment.id}/download"
    return attachment


@incidents_router.get("/{incident_id}/attachments", response_model=List[IncidentAttachmentOut])
def list_attachments(
    incident_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    attachments = db.query(IncidentAttachment).filter(
        IncidentAttachment.incident_id == incident_id
    ).order_by(IncidentAttachment.created_at.desc()).all()

    for attachment in attachments:
        attachment.view_url = f"/api/attachments/{attachment.id}/view"
        attachment.download_url = f"/api/attachments/{attachment.id}/download"

    return attachments


@attachments_router.get("/{attachment_id}/view")
def view_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.query(IncidentAttachment).filter(
        IncidentAttachment.id == attachment_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    incident = db.query(Incident).filter(
        Incident.id == attachment.incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    file_path = BASE_DIR / attachment.storage_key
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        media_type=attachment.mime_type,
        filename=attachment.file_name,
        headers={"Content-Disposition": f'inline; filename="{attachment.file_name}"'},
    )


@attachments_router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.query(IncidentAttachment).filter(
        IncidentAttachment.id == attachment_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    incident = db.query(Incident).filter(
        Incident.id == attachment.incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    file_path = BASE_DIR / attachment.storage_key
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        media_type=attachment.mime_type,
        filename=attachment.file_name,
        headers={"Content-Disposition": f'attachment; filename="{attachment.file_name}"'},
    )


@incident_attachments_router.delete("/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.query(IncidentAttachment).filter(
        IncidentAttachment.id == attachment_id
    ).first()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    incident = db.query(Incident).filter(
        Incident.id == attachment.incident_id,
        Incident.reported_by_user_id == current_user.id
    ).first()

    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    file_path = BASE_DIR / attachment.storage_key
    if file_path.exists():
        file_path.unlink()

    db.delete(attachment)
    db.commit()
    return {"message": "Attachment deleted"}
