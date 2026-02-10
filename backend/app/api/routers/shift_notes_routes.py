from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from zoneinfo import ZoneInfo

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.shift_note import ShiftNote
from app.schemas.shift_notes import ShiftNoteUpsert, ShiftNotesTodayOut


router = APIRouter(prefix="/api/shift-notes", tags=["shift-notes"])

ALLOWED_SHIFT_TYPES = {"opening", "closing"}
LA_TZ = ZoneInfo("America/Los_Angeles")


def date_label(note_date):
    return note_date.strftime("%A, %B %d")


def build_today_response(note_date, opening_note, closing_note):
    def build_entry(note):
        if not note:
            return None
        updated_by = None
        if note.updated_by_user:
            updated_by = {
                "id": note.updated_by_user.id,
                "email": note.updated_by_user.email,
            }
        return {
            "content": note.content,
            "updated_at": note.updated_at,
            "updated_by": updated_by,
        }

    return {
        "note_date": note_date,
        "date_label": date_label(note_date),
        "opening": build_entry(opening_note),
        "closing": build_entry(closing_note),
    }


@router.get("/today", response_model=ShiftNotesTodayOut)
def get_today_shift_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = datetime.now(LA_TZ).date()
    notes = db.query(ShiftNote).filter(
        ShiftNote.note_date == today,
        ShiftNote.workspace_id == current_user.workspace_id,
    ).all()

    opening_note = next((n for n in notes if n.shift_type == "opening"), None)
    closing_note = next((n for n in notes if n.shift_type == "closing"), None)

    return build_today_response(today, opening_note, closing_note)


@router.put("", response_model=ShiftNotesTodayOut)
def upsert_shift_note(
    payload: ShiftNoteUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shift_type = payload.shift_type.lower().strip()
    content = payload.content.strip()

    if shift_type not in ALLOWED_SHIFT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid shift_type")
    if not content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")

    note = db.query(ShiftNote).filter(
        ShiftNote.note_date == payload.note_date,
        ShiftNote.shift_type == shift_type,
        ShiftNote.workspace_id == current_user.workspace_id,
    ).first()

    if note:
        note.content = content
        note.updated_at = datetime.utcnow()
        note.updated_by_user_id = current_user.id
    else:
        note = ShiftNote(
            workspace_id=current_user.workspace_id,
            note_date=payload.note_date,
            shift_type=shift_type,
            content=content,
            updated_at=datetime.utcnow(),
            updated_by_user_id=current_user.id,
        )
        db.add(note)

    db.commit()

    notes = db.query(ShiftNote).filter(
        ShiftNote.note_date == payload.note_date,
        ShiftNote.workspace_id == current_user.workspace_id,
    ).all()
    opening_note = next((n for n in notes if n.shift_type == "opening"), None)
    closing_note = next((n for n in notes if n.shift_type == "closing"), None)

    return build_today_response(payload.note_date, opening_note, closing_note)
