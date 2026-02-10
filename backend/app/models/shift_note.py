from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class ShiftNote(Base):
    __tablename__ = "shift_notes"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    note_date = Column(Date, nullable=False, index=True)
    shift_type = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    updated_by_user = relationship("User")

    __table_args__ = (
        UniqueConstraint("workspace_id", "note_date", "shift_type", name="uq_shift_notes_workspace_date_shift_type"),
    )
