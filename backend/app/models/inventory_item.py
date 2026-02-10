from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.db.base import Base

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)

    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    quantity = Column(Integer, nullable=False, default=0)
    reorder_threshold = Column(Integer, nullable=False, default=0)
    reorder_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
