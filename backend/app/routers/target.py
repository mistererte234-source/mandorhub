import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, Target, Site, Project

router = APIRouter(prefix="/api/targets", tags=["targets"])

class TargetCreate(BaseModel):
    title: str
    week_number: int
    weight: float

class TargetOut(BaseModel):
    id: uuid.UUID
    title: str
    week_number: int
    weight: float
    status: str

@router.post("/project/{project_id}")
def create_targets(
    project_id: str,
    targets: List[TargetCreate],
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "contractor":
        raise HTTPException(status_code=403, detail="Hanya Bos yang dapat mengatur target")

    project = session.get(Project, project_id)
    if not project or project.org_id != user.org_id or str(project.bos_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")

    # Get site
    site = session.exec(select(Site).where(Site.project_id == project.id)).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site tidak ditemukan")

    # Delete existing weekly targets for this site to replace them
    existing = session.exec(select(Target).where(Target.site_id == site.id, Target.period_type == "weekly")).all()
    for e in existing:
        session.delete(e)
    
    session.commit()

    created_targets = []
    for t in targets:
        nt = Target(
            id=uuid.uuid4(),
            org_id=user.org_id,
            site_id=site.id,
            title=t.title,
            period_type="weekly",
            week_number=t.week_number,
            weight=t.weight,
            status="pending"
        )
        session.add(nt)
        created_targets.append(nt)
    
    session.commit()
    return {"message": "Targets updated", "count": len(created_targets)}


@router.get("/project/{project_id}", response_model=List[TargetOut])
def get_targets(
    project_id: str,
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    project = session.get(Project, project_id)
    if not project or project.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    site = session.exec(select(Site).where(Site.project_id == project.id)).first()
    if not site:
        return []

    targets = session.exec(select(Target).where(Target.site_id == site.id, Target.period_type == "weekly").order_by(Target.week_number)).all()
    
    return [
        TargetOut(
            id=t.id,
            title=t.title,
            week_number=t.week_number or 1,
            weight=t.weight or 0.0,
            status=t.status
        ) for t in targets
    ]

class TargetStatusPatch(BaseModel):
    status: str

@router.patch("/{target_id}", response_model=TargetOut)
def patch_target_status(
    target_id: str,
    body: TargetStatusPatch,
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role not in ["mandor", "contractor", "admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    t = session.get(Target, target_id)
    if not t or t.org_id != user.org_id:
        raise HTTPException(status_code=404, detail="Target tidak ditemukan")
        
    t.status = body.status
    session.add(t)
    session.commit()
    session.refresh(t)
    
    return TargetOut(
        id=t.id,
        title=t.title,
        week_number=t.week_number or 1,
        weight=t.weight or 0.0,
        status=t.status
    )

