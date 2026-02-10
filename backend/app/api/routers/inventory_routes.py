from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.inventory_item import InventoryItem
from app.models.vendor import Vendor
from app.schemas.inventory import InventoryCreate, InventoryUpdate, InventoryOut

router = APIRouter(prefix="/inventory", tags=["inventory"])

def validate_vendor_id(db: Session, vendor_id: Optional[int], current_user: User):
    if vendor_id is None:
        return None

    vendor = db.query(Vendor).filter(
        Vendor.id == vendor_id,
        Vendor.workspace_id == current_user.workspace_id
    ).first()

    if not vendor:
        raise HTTPException(status_code=400, detail="Invalid vendor_id")

    return vendor_id

def to_inventory_out(item: InventoryItem) -> dict:
    if item.quantity <= 0:
        status = "Out"
    elif item.quantity <= item.reorder_threshold:
        status = "Low"
    else:
        status = "In Stock"

    return {
        "id": item.id,
        "name": item.name,
        "category": item.category,
        "quantity": item.quantity,
        "reorder_threshold": item.reorder_threshold,
        "reorder_url": item.reorder_url,
        "notes": item.notes,
        "last_checked_at": item.last_checked_at,
        "vendor_id": item.vendor_id,
        "is_low_stock": item.quantity <= item.reorder_threshold,
        "status": status,
    }


@router.post("/", response_model=InventoryOut)
def create_item(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")
    if payload.reorder_threshold < 0:
        raise HTTPException(status_code=400, detail="Reorder threshold cannot be negative")

    vendor_id = validate_vendor_id(db, payload.vendor_id, current_user)

    item = InventoryItem(
        workspace_id=current_user.workspace_id,
        user_id=current_user.id,
        vendor_id=vendor_id,
        name=payload.name,
        category=payload.category,
        quantity=payload.quantity,
        reorder_threshold=payload.reorder_threshold,
        reorder_url=payload.reorder_url,
        notes=payload.notes,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return to_inventory_out(item)


@router.get("/", response_model=List[InventoryOut])
def list_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = db.query(InventoryItem).filter(
        InventoryItem.workspace_id == current_user.workspace_id
    ).all()

    return [to_inventory_out(i) for i in items]

@router.get("/low-stock", response_model=List[InventoryOut])
def list_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.workspace_id == current_user.workspace_id)
        .filter(InventoryItem.quantity <= InventoryItem.reorder_threshold)
        .all()
    )

    return [to_inventory_out(i) for i in items]


@router.get("/{item_id}", response_model=InventoryOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == current_user.workspace_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    return to_inventory_out(item)


@router.put("/{item_id}", response_model=InventoryOut)
def update_item(
    item_id: int,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == current_user.workspace_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if payload.quantity is not None and payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")

    if payload.reorder_threshold is not None and payload.reorder_threshold < 0:
        raise HTTPException(status_code=400, detail="Reorder threshold cannot be negative")

    if payload.vendor_id is not None:
        item.vendor_id = validate_vendor_id(db, payload.vendor_id, current_user)

    if payload.name is not None:
        item.name = payload.name
    if payload.category is not None:
        item.category = payload.category
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.reorder_threshold is not None:
        item.reorder_threshold = payload.reorder_threshold
    if payload.reorder_url is not None:
        item.reorder_url = payload.reorder_url
    if payload.notes is not None:
        item.notes = payload.notes

    db.commit()
    db.refresh(item)

    return to_inventory_out(item)


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == current_user.workspace_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Item deleted"}


@router.post("/{item_id}/check", response_model=InventoryOut)
def check_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(InventoryItem).filter(
        InventoryItem.id == item_id,
        InventoryItem.workspace_id == current_user.workspace_id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    item.last_checked_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    return to_inventory_out(item)


@router.post("/check")
def check_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    checked_at = datetime.utcnow()
    items = db.query(InventoryItem).filter(
        InventoryItem.workspace_id == current_user.workspace_id
    ).all()

    for item in items:
        item.last_checked_at = checked_at

    db.commit()

    return {"checked_count": len(items), "checked_at": checked_at.isoformat()}

