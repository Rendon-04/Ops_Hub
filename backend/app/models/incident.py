from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    incident_type = Column(String, nullable=False)
    occurred_at = Column(DateTime(timezone=True), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String, nullable=False)
    action_taken = Column(Text, nullable=False)
    follow_up_needed = Column(Boolean, nullable=False, default=False)
    follow_up_owner = Column(String, nullable=True)
    follow_up_due_date = Column(DateTime(timezone=True), nullable=True)
    follow_up_notes = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="open")
    reported_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
