from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from pathlib import Path
import os
import uuid

from app.db.session import get_db
from app.auth.deps import get_current_user, require_admin
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentOut, DocumentUpdate, DOCUMENT_CATEGORIES


router = APIRouter(prefix="/api/documents", tags=["documents"])

MAX_FILE_SIZE = 25 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "text/plain",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".png", ".jpg", ".jpeg", ".txt"}

BASE_DIR = Path(__file__).resolve().parents[3]
STORAGE_DIR = BASE_DIR / "storage" / "documents"


def validate_category(category: Optional[str]):
    if category and category not in DOCUMENT_CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid category")


def validate_title(title: str):
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")


@router.get("", response_model=List[DocumentOut])
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    category: Optional[str] = None,
    search: Optional[str] = None,
    pinned_only: Optional[bool] = Query(None),
):
    validate_category(category)

    query = db.query(Document)

    if category:
        query = query.filter(Document.category == category)
    if search:
        search_value = f"%{search.lower()}%"
        query = query.filter(
            (Document.title.ilike(search_value)) |
            (Document.original_filename.ilike(search_value))
        )
    if pinned_only is True:
        query = query.filter(Document.is_pinned.is_(True))

    query = query.filter(Document.workspace_id == current_user.workspace_id)
    return query.order_by(Document.is_pinned.desc(), Document.created_at.desc()).all()


@router.post("", response_model=DocumentOut)
def upload_document(
    title: str = Form(...),
    category: str = Form(...),
    description: Optional[str] = Form(None),
    is_pinned: Optional[bool] = Form(False),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    validate_category(category)
    validate_title(title)

    if not file:
        raise HTTPException(status_code=400, detail="File is required")

    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    STORAGE_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = os.path.basename(file.filename or "upload")
    stored_filename = f"{uuid.uuid4().hex}_{safe_name}"
    target_path = STORAGE_DIR / stored_filename

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

    doc = Document(
        workspace_id=current_user.workspace_id,
        title=title.strip(),
        category=category,
        description=description,
        original_filename=safe_name,
        stored_filename=stored_filename,
        mime_type=file.content_type,
        file_size=size,
        is_pinned=bool(is_pinned),
        uploaded_by_user_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{doc_id}/download")
def download_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if doc and doc.workspace_id != current_user.workspace_id:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = STORAGE_DIR / doc.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    from fastapi.responses import FileResponse
    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.original_filename,
        headers={"Content-Disposition": f'attachment; filename="{doc.original_filename}"'},
    )


@router.put("/{doc_id}", response_model=DocumentOut)
def update_document(
    doc_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if doc and doc.workspace_id != current_user.workspace_id:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    validate_category(payload.category)

    if payload.title is not None:
        validate_title(payload.title)
        doc.title = payload.title.strip()
    if payload.category is not None:
        doc.category = payload.category
    if payload.description is not None:
        doc.description = payload.description
    if payload.is_pinned is not None:
        doc.is_pinned = payload.is_pinned

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if doc and doc.workspace_id != current_user.workspace_id:
        doc = None
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = STORAGE_DIR / doc.stored_filename
    if file_path.exists():
        file_path.unlink()

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
