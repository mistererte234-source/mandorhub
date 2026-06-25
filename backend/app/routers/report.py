import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_session, get_current_user
from ..models import DailyReport, Target
from ..schemas import ReportCreate, UserOut

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

    report = DailyReport(
        org_id=current_user.org_id,
        site_id=payload.site_id,
        target_id=payload.target_id,
        mandor_id=current_user.id,
        report_date=datetime.date.today(),
        worker_attendance=attendance_data,
        work_done=payload.work_done,
        target_status=payload.target_status,
        submit_status="submitted",
        submitted_server_at=datetime.datetime.now(datetime.timezone.utc),
        locked=True
    )

    db.add(report)

    # If target is achieved, update the target status
    if payload.target_status == "tercapai" and payload.target_id:
        target = db.query(Target).filter(Target.id == payload.target_id).first()
        if target:
            target.status = "done"

    db.commit()
    return {"message": "Laporan berhasil disimpan"}
