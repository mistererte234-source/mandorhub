from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..deps import get_session, get_current_user
from ..models import Site, Project, DailyReport, Issue
from ..schemas import UserOut, SiteDetailOut, TimelineItem
import datetime

router = APIRouter(prefix="/api/sites", tags=["Sites"])

@router.get("/{site_id}/timeline", response_model=SiteDetailOut)
def get_site_timeline(
    site_id: str,
    db: Session = Depends(get_session),
    current_user: UserOut = Depends(get_current_user),
):
    # Fetch site and project
    site = db.query(Site).filter(Site.id == site_id, Site.org_id == current_user.org_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site tidak ditemukan")
        
    project = db.query(Project).filter(Project.id == site.project_id).first()

    timeline = []

    # Fetch daily reports
    reports = db.query(DailyReport).filter(DailyReport.site_id == site_id, DailyReport.deleted_at == None).all()
    for r in reports:
        timeline.append(TimelineItem(
            id=r.id,
            type="report",
            title="Laporan Harian",
            description=r.work_done or "Laporan dikirim",
            timestamp=r.submitted_server_at or r.created_at,
            data={"attendance": r.worker_attendance}
        ))

    # Fetch issues
    issues = db.query(Issue).filter(Issue.site_id == site_id, Issue.deleted_at == None).all()
    for i in issues:
        # Issue created event
        timeline.append(TimelineItem(
            id=i.id,
            type="issue_open",
            title=f"Masalah: {i.issue_type.capitalize()}",
            description=i.description or "",
            timestamp=i.created_at,
            data=None
        ))
        # Issue resolved event
        if i.status == "resolved" and i.updated_at and i.updated_at > i.created_at:
            timeline.append(TimelineItem(
                id=i.id, # using same id for now, frontend uses index as key ideally
                type="issue_resolved",
                title="Masalah Selesai",
                description=f"Penyelesaian: {i.issue_type.capitalize()}",
                timestamp=i.updated_at,
                data=None
            ))

    # Sort timeline by timestamp descending
    timeline.sort(key=lambda x: x.timestamp, reverse=True)

    return SiteDetailOut(
        site_id=site.id,
        project=project.name if project else "",
        project_id=site.project_id,
        name=site.name,
        timeline=timeline
    )
