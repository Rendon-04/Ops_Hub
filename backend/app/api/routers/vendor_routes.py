from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorOut

router = APIRouter(prefix="/vendors", tags=["vendors"])


@router.post("/", response_model=VendorOut)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = Vendor(
        user_id=current_user.id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/", response_model=List[VendorOut])
def list_vendors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Vendor).filter(Vendor.user_id == current_user.id).all()


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = (
        db.query(Vendor)
        .filter(Vendor.id == vendor_id, Vendor.user_id == current_user.id)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.put("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: int,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = (
        db.query(Vendor)
        .filter(Vendor.id == vendor_id, Vendor.user_id == current_user.id)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if payload.name is not None:
        vendor.name = payload.name
    if payload.email is not None:
        vendor.email = payload.email
    if payload.phone is not None:
        vendor.phone = payload.phone

    db.commit()
    db.refresh(vendor)
    return vendor


@router.delete("/{vendor_id}")
def delete_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendor = (
        db.query(Vendor)
        .filter(Vendor.id == vendor_id, Vendor.user_id == current_user.id)
        .first()
    )
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted"}
