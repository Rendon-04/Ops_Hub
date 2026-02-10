import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.config import OAUTH_TOKEN_URL
from app.db.session import get_db
from app.auth.security import decode_token
from app.models.user import User

TOKEN_URL = os.getenv("OAUTH_TOKEN_URL", "/auth/login")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=OAUTH_TOKEN_URL)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = decode_token(token)
        user_id = payload.get("user_id")
        if not user_id:
            raise Exception()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.workspace_id is None:
        raise HTTPException(status_code=403, detail="User workspace not set")

    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    admin_emails = os.getenv("ADMIN_EMAILS", "")
    allowed = {email.strip().lower() for email in admin_emails.split(",") if email.strip()}
    if current_user.role == "admin":
        return current_user
    if allowed and current_user.email.lower() not in allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if not allowed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
