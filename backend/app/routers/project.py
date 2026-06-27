from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, Project
from ..schemas import ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/my", response_model=list[ProjectOut])
def get_my_projects(
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Kembalikan proyek yang relevan berdasarkan role:
    - contractor  → proyek di mana dia jadi Bos (bos_id = user.id)
    - mandor      → proyek di mana dia jadi Mandor (mandor_id = user.id)
    - bendahara   → proyek di mana dia jadi Bendahara (bendahara_id = user.id)
    - admin       → semua proyek di org
    """
    org_id = str(user.org_id)
    user_id = str(user.id)

    if user.role == "contractor":
        where = "AND p.bos_id = CAST(:user_id AS uuid)"
    elif user.role == "mandor":
        where = "AND p.mandor_id = CAST(:user_id AS uuid)"
    elif user.role == "bendahara":
        where = "AND p.bendahara_id = CAST(:user_id AS uuid)"
    elif user.role == "admin":
        where = ""
    else:
        return []

    sql = text(f"""
        SELECT
            p.id, p.name, p.client_name, p.status,
            b.name AS bos_name,
            m.name AS mandor_name,
            f.name AS bendahara_name,
            p.tukang_daily_rate,
            p.kuli_daily_rate,
            COALESCE((
                SELECT SUM(t.weight)
                FROM target t
                JOIN site s ON s.id = t.site_id
                WHERE s.project_id = p.id AND t.status = 'done'
            ), 0) AS progress_percent
        FROM project p
        JOIN  app_user b ON b.id = p.bos_id
        JOIN  app_user m ON m.id = p.mandor_id
        LEFT  JOIN app_user f ON f.id = p.bendahara_id
        WHERE p.org_id = CAST(:org_id AS uuid)
          AND p.deleted_at IS NULL
          {where}
        ORDER BY p.name
    """)

    try:
        rows = session.execute(sql, {"org_id": org_id, "user_id": user_id}).mappings().all()
        return [ProjectOut(**row) for row in rows]
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Gagal memuat daftar proyek") from exc

from pydantic import BaseModel

class ProjectRatesPatch(BaseModel):
    tukang_daily_rate: float | None = None
    kuli_daily_rate: float | None = None

@router.patch("/{project_id}/rates", response_model=ProjectOut)
def patch_project_rates(
    project_id: str,
    body: ProjectRatesPatch,
    user: AppUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    if user.role != "contractor":
        raise HTTPException(status_code=403, detail="Hanya Bos yang dapat mengubah gaji")
        
    p = session.get(Project, project_id)
    if not p or p.org_id != user.org_id or str(p.bos_id) != str(user.id) or p.deleted_at:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    if body.tukang_daily_rate is not None:
        p.tukang_daily_rate = body.tukang_daily_rate
    if body.kuli_daily_rate is not None:
        p.kuli_daily_rate = body.kuli_daily_rate
        
    session.add(p)
    session.commit()
    session.refresh(p)
    
    # Reload bos, mandor, bendahara names for response
    bos = session.get(AppUser, p.bos_id)
    mandor = session.get(AppUser, p.mandor_id)
    bendahara = session.get(AppUser, p.bendahara_id) if p.bendahara_id else None
    
    return ProjectOut(
        id=p.id, name=p.name, client_name=p.client_name, status=p.status,
        bos_name=bos.name if bos else None,
        mandor_name=mandor.name if mandor else None,
        bendahara_name=bendahara.name if bendahara else None,
        tukang_daily_rate=p.tukang_daily_rate,
        kuli_daily_rate=p.kuli_daily_rate,
        progress_percent=0.0
    )

