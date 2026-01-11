from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

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
        Vendor.user_id == current_user.id
    ).first()

    if not vendor:
        raise HTTPException(status_code=400, detail="Invalid vendor_id")

    return vendor_id

def to_inventory_out(item: InventoryItem) -> dict:
    return {
        "id": item.id,
        "name": item.name,
        "sku": item.sku,
        "quantity": item.quantity,
        "reorder_threshold": item.reorder_threshold,
        "vendor_id": item.vendor_id,
        "is_low_stock": item.quantity <= item.reorder_threshold
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
        user_id=current_user.id,
        vendor_id=vendor_id,
        name=payload.name,
        sku=payload.sku,
        quantity=payload.quantity,
        reorder_threshold=payload.reorder_threshold
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
        InventoryItem.user_id == current_user.id
    ).all()

    return [to_inventory_out(i) for i in items]

@router.get("/low-stock", response_model=List[InventoryOut])
def list_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items = (
        db.query(InventoryItem)
        .filter(InventoryItem.user_id == current_user.id)
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
        InventoryItem.user_id == current_user.id
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
        InventoryItem.user_id == current_user.id
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
    if payload.sku is not None:
        item.sku = payload.sku
    if payload.quantity is not None:
        item.quantity = payload.quantity
    if payload.reorder_threshold is not None:
        item.reorder_threshold = payload.reorder_threshold

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
        InventoryItem.user_id == current_user.id
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    db.delete(item)
    db.commit()

    return {"message": "Item deleted"}




