from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.sql import func
from app.db.base import Base

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True, index=True)
    event_name = Column(String, nullable=True)
    title = Column(String, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(String, nullable=False, default="OPEN")
    task_type = Column(String, nullable=False, default="OTHER")
    is_high_priority = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
