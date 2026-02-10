import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from urllib.parse import urlencode

from app.db.session import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.schemas.auth import UserCreate, UserLogin, TokenResponse
from app.auth.security import create_access_token
from app.auth.google import build_google_auth_url, exchange_code_for_tokens, verify_google_id_token
from app.auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup")
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    raise HTTPException(status_code=410, detail="Password signup is disabled. Use Google login.")



@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    raise HTTPException(status_code=410, detail="Password login is disabled. Use Google login.")


@router.get("/google/login")
def google_login():
    return RedirectResponse(build_google_auth_url())


@router.get("/google/callback")
def google_callback(code: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    if error:
        raise HTTPException(status_code=400, detail=error)
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    token_data = exchange_code_for_tokens(code)
    id_token = token_data.get("id_token")
    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token from Google")

    payload = verify_google_id_token(id_token)
    email = (payload.get("email") or "").strip().lower()
    email_verified = payload.get("email_verified") is True
    google_sub = payload.get("sub")
    name = payload.get("name") or payload.get("given_name") or ""
    hosted_domain = payload.get("hd")

    if not email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    if not email.endswith("@neon.work"):
        raise HTTPException(status_code=403, detail="Email domain not allowed")
    if hosted_domain and hosted_domain != "neon.work":
        raise HTTPException(status_code=403, detail="Hosted domain not allowed")
    if not google_sub:
        raise HTTPException(status_code=400, detail="Missing Google subject")

    workspace = db.query(Workspace).filter(Workspace.name == "Neon Spaces").first()
    if not workspace:
        workspace = Workspace(name="Neon Spaces")
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

    user = db.query(User).filter((User.google_sub == google_sub) | (User.email == email)).first()
    if not user:
        existing_count = db.query(User).filter(User.workspace_id == workspace.id).count()
        role = "admin" if existing_count == 0 else "member"
        user = User(
            email=email,
            name=name or None,
            google_sub=google_sub,
            workspace_id=workspace.id,
            role=role,
            password_hash=None,
        )
        db.add(user)
    else:
        user.email = email
        if not user.google_sub:
            user.google_sub = google_sub
        if name and not user.name:
            user.name = name
        user.workspace_id = workspace.id
        if not user.role:
            user.role = "member"

    db.commit()
    db.refresh(user)

    token = create_access_token(
        {
            "user_id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "workspace_id": user.workspace_id,
        }
    )
    base_url = os.getenv("APP_BASE_URL", "http://localhost:5173")
    redirect_url = f"{base_url}/?{urlencode({'token': token})}"
    return RedirectResponse(redirect_url)


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "workspace_id": current_user.workspace_id,
    }
