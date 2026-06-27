import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_session, get_current_user
from ..models import DailyReport, Target
from ..schemas import ReportCreate, ReportUpdate, UserOut

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.post("")
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_session),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role != "mandor":
        raise HTTPException(status_code=403, detail="Hanya mandor yang bisa mengirim laporan")

    # Serialize worker_attendance to list of dicts for JSONB
    attendance_data = [item.model_dump() for item in payload.worker_attendance if item.count > 0]

    r_date = payload.report_date or datetime.date.today()
    existing = db.query(DailyReport).filter(
        DailyReport.site_id == payload.site_id,
        DailyReport.report_date == r_date
    ).first()

    if existing:
        existing.worker_attendance = attendance_data
        existing.work_done = payload.work_done
        existing.target_status = payload.target_status
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    report = DailyReport(
        org_id=current_user.org_id,
        site_id=payload.site_id,
        target_id=payload.target_id,
        mandor_id=current_user.id,
        report_date=r_date,
        worker_attendance=attendance_data,
        work_done=payload.work_done,
        target_status=payload.target_status,
        submit_status="submitted",
        submitted_server_at=datetime.datetime.utcnow(),
    )

    db.add(report)

    # If target is achieved, update the target status
    if payload.target_status == "tercapai" and payload.target_id:
        target = db.query(Target).filter(Target.id == payload.target_id).first()
        if target:
            target.status = "done"

    db.commit()
    return {"message": "Laporan berhasil disimpan"}


@router.put("/{report_id}")
def update_report(
    report_id: str,
    payload: ReportUpdate,
    db: Session = Depends(get_session),
    current_user: UserOut = Depends(get_current_user),
):
    if current_user.role not in ["contractor", "admin"]:
        raise HTTPException(status_code=403, detail="Hanya Bos/Admin yang bisa mengedit laporan")

    report = db.query(DailyReport).filter(DailyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")

    if current_user.role == "contractor" and report.org_id != current_user.org_id:
        raise HTTPException(status_code=403, detail="Bukan organisasi Anda")

    if payload.work_done is not None:
        report.work_done = payload.work_done

    if payload.worker_attendance is not None:
        attendance_data = [item.model_dump() for item in payload.worker_attendance if item.count > 0]
        report.worker_attendance = attendance_data

    db.commit()
    return {"message": "Laporan berhasil diedit"}
