from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    google_sub = Column(String, unique=True, nullable=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True, index=True)
    role = Column(String, nullable=False, default="member")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
