from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import uuid

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser
from ..schemas import UserOut, UserUpdateIn

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=list[UserOut])
def get_users(
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Hanya kembalikan user dari organisasi yang sama
    users = session.exec(
        select(AppUser).where(AppUser.org_id == user.org_id, AppUser.is_active == True)
    ).all()
    return users

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    body: UserUpdateIn,
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Hanya kontraktor (Bos), admin, atau user itu sendiri yang boleh mengubah.
    if user.role not in ["contractor", "admin"] and user.id != user_id:
        raise HTTPException(status_code=403, detail="Tidak ada akses untuk mengubah data ini")

    target_user = session.get(AppUser, user_id)
    if not target_user or target_user.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    # Update data
    if body.phone is not None:
        # Format input nomor telepon jadi standard jika perlu (sementara kita asumsikan FE sudah format/biarkan)
        target_user.phone = body.phone
    if body.name is not None:
        target_user.name = body.name

    session.add(target_user)
    session.commit()
    session.refresh(target_user)

    return target_user
