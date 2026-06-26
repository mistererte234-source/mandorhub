from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text
import uuid

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, AppSetting, VisitorLog, Project, Site
from ..schemas import PasswordUpdateIn, VisitorLogOut, AdminProjectOut, AdminProjectCreate

router = APIRouter(prefix="/api/admin", tags=["admin"])

def get_admin_user(user: AppUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Membutuhkan role admin.")
    return user

@router.get("/projects", response_model=list[AdminProjectOut])
def get_all_projects(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    sql = text("""
        SELECT 
            p.id, 
            p.name, 
            p.client_name, 
            p.status,
            b.name AS bos_name,
            m.name AS mandor_name
        FROM project p
        LEFT JOIN app_user b ON p.created_by = b.id
        LEFT JOIN site s ON s.project_id = p.id
        LEFT JOIN app_user m ON s.assigned_mandor_id = m.id
        WHERE p.org_id = CAST(:org_id AS uuid) AND p.deleted_at IS NULL
    """)
    rows = session.execute(sql, {"org_id": str(admin.org_id)}).fetchall()
    return [
        AdminProjectOut(
            id=row.id,
            name=row.name,
            client_name=row.client_name,
            status=row.status,
            bos_name=row.bos_name,
            mandor_name=row.mandor_name
        ) for row in rows
    ]

@router.post("/projects")
def create_project(
    body: AdminProjectCreate,
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    org_id = admin.org_id
    
    # Validasi bos & mandor
    bos = session.get(AppUser, body.bos_id)
    mandor = session.get(AppUser, body.mandor_id)
    if not bos or bos.role != "contractor" or bos.org_id != org_id:
        raise HTTPException(status_code=400, detail="Bos tidak valid")
    if not mandor or mandor.role != "mandor" or mandor.org_id != org_id:
        raise HTTPException(status_code=400, detail="Mandor tidak valid")
        
    p_id = uuid.uuid4()
    new_project = Project(
        id=p_id,
        org_id=org_id,
        name=body.name,
        client_name=body.client_name,
        created_by=bos.id,
        status="active"
    )
    
    # Auto-create 1 main site
    new_site = Site(
        id=uuid.uuid4(),
        org_id=org_id,
        project_id=p_id,
        name="Titik Utama",
        assigned_mandor_id=mandor.id
    )
    
    session.add(new_project)
    session.add(new_site)
    session.commit()
    
    return {"message": "Proyek berhasil dibuat dan Mandor telah ditugaskan"}

@router.delete("/projects/{project_id}")
def delete_project(
    project_id: uuid.UUID,
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    p = session.get(Project, project_id)
    if not p or p.org_id != admin.org_id:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")
        
    import datetime
    now = datetime.datetime.utcnow()
    p.deleted_at = now
    
    # Also delete associated sites
    sites = session.exec(select(Site).where(Site.project_id == project_id)).all()
    for s in sites:
        s.deleted_at = now
        session.add(s)
        
    session.add(p)
    session.commit()
    return {"message": "Proyek berhasil dihapus"}

@router.put("/password")
def update_admin_password(
    body: PasswordUpdateIn,
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    setting = session.get(AppSetting, "admin_password")
    if not setting:
        setting = AppSetting(key="admin_password", value=body.new_password)
    else:
        setting.value = body.new_password
        
    session.add(setting)
    session.commit()
    return {"message": "Password admin berhasil diubah"}

@router.post("/seed-dummy")
def seed_dummy_data(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    # Seed dummy data directly via SQL to bypass complex object creation
    org_id = str(admin.org_id)
    # We will find any active contractor and mandor to assign
    bos = session.exec(select(AppUser).where(AppUser.role == "contractor", AppUser.org_id == org_id)).first()
    mandor = session.exec(select(AppUser).where(AppUser.role == "mandor", AppUser.org_id == org_id)).first()
    
    if not bos or not mandor:
        raise HTTPException(status_code=400, detail="Organisasi harus memiliki setidaknya 1 Bos dan 1 Mandor")
        
    # Generate UUIDs
    p_id = str(uuid.uuid4())
    s_id = str(uuid.uuid4())
    
    sql = text("""
        INSERT INTO project (id, org_id, name, client_name, address_short, status, created_by)
        VALUES (:p_id, CAST(:org_id AS uuid), 'Proyek Dummy Admin', 'Klien Dummy', 'Alamat Dummy', 'active', CAST(:bos_id AS uuid));
        
        INSERT INTO site (id, org_id, project_id, name, address, assigned_mandor_id)
        VALUES (:s_id, CAST(:org_id AS uuid), CAST(:p_id AS uuid), 'Titik Dummy 1', 'Lokasi Dummy', CAST(:mandor_id AS uuid));
        
        INSERT INTO issue (id, org_id, site_id, reported_by, issue_type, urgency, description, status)
        VALUES (gen_random_uuid(), CAST(:org_id AS uuid), CAST(:s_id AS uuid), CAST(:mandor_id AS uuid), 'material', 'high', 'Material Dummy Habis', 'open');
    """)
    
    session.execute(sql, {
        "p_id": p_id,
        "s_id": s_id,
        "org_id": org_id,
        "bos_id": str(bos.id),
        "mandor_id": str(mandor.id)
    })
    session.commit()
    
    return {"message": "Data dummy berhasil ditanamkan!"}

@router.post("/clear-dummy")
def clear_dummy_data(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    # Only clear data that belongs to the org
    org_id = str(admin.org_id)
    
    sql = text("""
        DELETE FROM audit_log WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM approval WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM evidence WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM issue WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM daily_report WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM target WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM site WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM project WHERE org_id = CAST(:org_id AS uuid);
    """)
    session.execute(sql, {"org_id": org_id})
    session.commit()
    
    return {"message": "Semua data proyek (termasuk non-dummy) berhasil dibersihkan!"}

@router.get("/spy-logs", response_model=list[VisitorLogOut])
def get_spy_logs(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    # Get last 100 logs
    logs = session.exec(
        select(VisitorLog).order_by(VisitorLog.created_at.desc()).limit(100)
    ).all()
    
    out = []
    for log in logs:
        # Format time to Jakarta time (UTC+7)
        dt = log.created_at
        try:
            # Add 7 hours manually since it's naive UTC from SQLModel
            import datetime
            dt = dt + datetime.timedelta(hours=7)
            time_str = dt.strftime("%d %b %Y, %H:%M:%S")
        except:
            time_str = str(dt)
            
        out.append(VisitorLogOut(
            id=log.id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            path=log.path,
            created_at=time_str
        ))
        
    return out
