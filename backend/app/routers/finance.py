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


@router.get("/weekly-wages")
def get_weekly_wages(
    project_id: uuid.UUID = Query(...),
    start_date: datetime.date = Query(...),
    end_date: datetime.date = Query(...),
    db: Session = Depends(get_session),
    current_user: AppUser = Depends(get_current_user)
):
    if current_user.role not in ["bendahara", "admin", "contractor"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    from ..models import Site, DailyReport
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project or project.org_id != current_user.org_id:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    site = db.query(Site).filter(Site.project_id == project_id).first()
    if not site:
        return {"total_tukang_count": 0, "total_kuli_count": 0, "total_wage": 0}
        
    reports = db.query(DailyReport).filter(
        DailyReport.site_id == site.id,
        DailyReport.report_date >= start_date,
        DailyReport.report_date <= end_date,
        DailyReport.deleted_at == None
    ).all()
    
    total_tukang_count = 0
    total_kuli_count = 0
    
    for r in reports:
        if r.worker_attendance:
            for w in r.worker_attendance:
                role = str(w.get('role', '')).lower().strip()
                count = int(w.get('count', 0))
                if 'tukang' in role:
                    total_tukang_count += count
                elif 'kuli' in role or 'laden' in role or 'kenek' in role or 'pembantu' in role:
                    total_kuli_count += count
                    
    tukang_rate = project.tukang_daily_rate or 0
    kuli_rate = project.kuli_daily_rate or 0
    
    total_wage = (total_tukang_count * tukang_rate) + (total_kuli_count * kuli_rate)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "tukang_rate": tukang_rate,
        "kuli_rate": kuli_rate,
        "total_tukang_count": total_tukang_count,
        "total_kuli_count": total_kuli_count,
        "total_wage": total_wage
    }

