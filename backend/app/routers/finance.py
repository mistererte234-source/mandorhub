import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, FinanceLog, Project
from ..schemas import FinanceCreate, FinanceOut

router = APIRouter(prefix="/api/finance", tags=["Finance"])

@router.post("", response_model=FinanceOut)
def create_finance_log(
    payload: FinanceCreate,
    db: Session = Depends(get_session),
    current_user: AppUser = Depends(get_current_user),
):
    if current_user.role not in ["bendahara", "admin", "contractor"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project or project.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")

    log = FinanceLog(
        org_id=current_user.org_id,
        project_id=payload.project_id,
        type=payload.type,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        date=payload.date,
        recorded_by=current_user.id
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("", response_model=list[FinanceOut])
def get_finance_logs(
    project_id: uuid.UUID = Query(...),
    db: Session = Depends(get_session),
    current_user: AppUser = Depends(get_current_user),
):
    if current_user.role not in ["bendahara", "admin", "contractor"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")

    logs = db.query(FinanceLog).filter(FinanceLog.project_id == project_id).order_by(FinanceLog.date.desc(), FinanceLog.created_at.desc()).all()
    return logs
