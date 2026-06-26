from fastapi import APIRouter, Depends
from sqlmodel import Session, select
import uuid

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, Project, Site
from ..schemas import ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("/my", response_model=list[ProjectOut])
def get_my_projects(
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Jika bos, kembalikan proyek yang dia buat
    if user.role == "contractor":
        projects = session.exec(
            select(Project)
            .where(Project.org_id == user.org_id)
            .where(Project.created_by == user.id)
            .where(Project.deleted_at == None)
        ).all()
        return projects
        
    # Jika mandor, kembalikan proyek dari titik (site) yang ditugaskan ke dia
    if user.role == "mandor":
        projects = session.exec(
            select(Project)
            .join(Site, Site.project_id == Project.id)
            .where(Project.org_id == user.org_id)
            .where(Site.assigned_mandor_id == user.id)
            .where(Project.deleted_at == None)
            .where(Site.deleted_at == None)
            .distinct()
        ).all()
        return projects

    # Jika bendahara, kembalikan proyek dari yang ditugaskan ke dia
    if user.role == "bendahara":
        projects = session.exec(
            select(Project)
            .where(Project.org_id == user.org_id)
            .where(Project.assigned_bendahara_id == user.id)
            .where(Project.deleted_at == None)
        ).all()
        return projects
        
    return []
