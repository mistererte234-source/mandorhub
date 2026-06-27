from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, text
from typing import Optional
import uuid

from ..core.db import get_session
from ..deps import get_current_user
from ..models import AppUser, AppSetting, VisitorLog, Project, Site
from ..schemas import (
    PasswordUpdateIn, VisitorLogOut,
    AdminProjectOut, AdminProjectCreate, AdminProjectPatch,
    UserOut
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_admin_user(user: AppUser = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Akses ditolak. Membutuhkan role admin.")
    return user


# ============================================================
# PROJECTS
# ============================================================

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
            p.bos_id,
            b.name  AS bos_name,
            b.phone AS bos_phone,
            p.mandor_id,
            m.name  AS mandor_name,
            m.phone AS mandor_phone,
            p.bendahara_id,
            f.name  AS bendahara_name,
            f.phone AS bendahara_phone,
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
        ORDER BY p.name
    """)
    rows = session.execute(sql, {"org_id": str(admin.org_id)}).mappings().all()
    return [AdminProjectOut(**row) for row in rows]


@router.post("/projects", response_model=AdminProjectOut)
def create_project(
    body: AdminProjectCreate,
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    org_id = admin.org_id
    try:
        # ── Buat Bos baru ──────────────────────────────────────────────────────
        # Cek duplikat phone di org
        existing_bos = session.exec(
            select(AppUser).where(AppUser.phone == body.bos.phone, AppUser.org_id == org_id)
        ).first()
        if existing_bos:
            if existing_bos.role != "contractor":
                raise HTTPException(status_code=400, detail=f"Nomor {body.bos.phone} sudah dipakai oleh {existing_bos.name} ({existing_bos.role})")
            bos = existing_bos   # pakai yang sudah ada jika sama role
        else:
            bos = AppUser(id=uuid.uuid4(), org_id=org_id, name=body.bos.name,
                          phone=body.bos.phone, role="contractor", is_active=True)
            session.add(bos)

        # ── Buat Mandor baru ───────────────────────────────────────────────────
        existing_mandor = session.exec(
            select(AppUser).where(AppUser.phone == body.mandor.phone, AppUser.org_id == org_id)
        ).first()
        if existing_mandor:
            if existing_mandor.role != "mandor":
                raise HTTPException(status_code=400, detail=f"Nomor {body.mandor.phone} sudah dipakai oleh {existing_mandor.name} ({existing_mandor.role})")
            mandor = existing_mandor
        else:
            mandor = AppUser(id=uuid.uuid4(), org_id=org_id, name=body.mandor.name,
                             phone=body.mandor.phone, role="mandor", is_active=True)
            session.add(mandor)

        # ── Buat Bendahara baru (opsional) ─────────────────────────────────────
        bendahara = None
        if body.bendahara:
            existing_bend = session.exec(
                select(AppUser).where(AppUser.phone == body.bendahara.phone, AppUser.org_id == org_id)
            ).first()
            if existing_bend:
                if existing_bend.role != "bendahara":
                    raise HTTPException(status_code=400, detail=f"Nomor {body.bendahara.phone} sudah dipakai oleh {existing_bend.name} ({existing_bend.role})")
                bendahara = existing_bend
            else:
                bendahara = AppUser(id=uuid.uuid4(), org_id=org_id, name=body.bendahara.name,
                                    phone=body.bendahara.phone, role="bendahara", is_active=True)
                session.add(bendahara)

        # Flush dulu agar ID user tersedia sebelum buat project
        session.flush()

        # ── Buat Proyek ────────────────────────────────────────────────────────
        p_id = uuid.uuid4()
        new_project = Project(
            id=p_id,
            org_id=org_id,
            name=body.name,
            client_name=body.client_name,
            bos_id=bos.id,
            mandor_id=mandor.id,
            bendahara_id=bendahara.id if bendahara else None,
            status="active"
        )
        new_site = Site(id=uuid.uuid4(), org_id=org_id, project_id=p_id, name="Titik Utama")

        session.add(new_project)
        session.add(new_site)
        session.commit()

        return AdminProjectOut(
            id=new_project.id,
            name=new_project.name,
            client_name=new_project.client_name,
            status=new_project.status,
            bos_id=bos.id, bos_name=bos.name, bos_phone=bos.phone,
            mandor_id=mandor.id, mandor_name=mandor.name, mandor_phone=mandor.phone,
            bendahara_id=bendahara.id if bendahara else None,
            bendahara_name=bendahara.name if bendahara else None,
            bendahara_phone=bendahara.phone if bendahara else None,
        )
    except HTTPException:
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"DB Error saat simpan proyek: {str(e)}")


@router.patch("/projects/{project_id}", response_model=AdminProjectOut)
def patch_project(
    project_id: uuid.UUID,
    body: AdminProjectPatch,
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    p = session.get(Project, project_id)
    if not p or p.org_id != admin.org_id or p.deleted_at:
        raise HTTPException(status_code=404, detail="Proyek tidak ditemukan")

    if body.name is not None:
        p.name = body.name
    if body.client_name is not None:
        p.client_name = body.client_name
    if body.status is not None:
        p.status = body.status
    if body.tukang_daily_rate is not None:
        p.tukang_daily_rate = body.tukang_daily_rate
    if body.kuli_daily_rate is not None:
        p.kuli_daily_rate = body.kuli_daily_rate

    if body.bos_id is not None:
        bos = session.get(AppUser, body.bos_id)
        if not bos or bos.role != "contractor" or bos.org_id != admin.org_id:
            raise HTTPException(status_code=400, detail="Bos tidak valid")
        p.bos_id = body.bos_id

    if body.mandor_id is not None:
        mandor = session.get(AppUser, body.mandor_id)
        if not mandor or mandor.role != "mandor" or mandor.org_id != admin.org_id:
            raise HTTPException(status_code=400, detail="Mandor tidak valid")
        p.mandor_id = body.mandor_id

    if "bendahara_id" in body.model_fields_set:
        if body.bendahara_id is not None:
            bendahara = session.get(AppUser, body.bendahara_id)
            if not bendahara or bendahara.role != "bendahara" or bendahara.org_id != admin.org_id:
                raise HTTPException(status_code=400, detail="Bendahara tidak valid")
        p.bendahara_id = body.bendahara_id

    session.add(p)
    session.commit()

    # Return full object
    bos = session.get(AppUser, p.bos_id)
    mandor = session.get(AppUser, p.mandor_id)
    bendahara = session.get(AppUser, p.bendahara_id) if p.bendahara_id else None

    return AdminProjectOut(
        id=p.id, name=p.name, client_name=p.client_name, status=p.status,
        bos_id=bos.id, bos_name=bos.name,
        mandor_id=mandor.id, mandor_name=mandor.name,
        bendahara_id=bendahara.id if bendahara else None,
        bendahara_name=bendahara.name if bendahara else None,
        tukang_daily_rate=p.tukang_daily_rate,
        kuli_daily_rate=p.kuli_daily_rate,
        progress_percent=0.0
    )


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

    # Soft-delete sites
    sites = session.exec(select(Site).where(Site.project_id == project_id)).all()
    for s in sites:
        s.deleted_at = now
        session.add(s)

    session.add(p)
    session.commit()
    return {"message": "Proyek berhasil dihapus"}


# ============================================================
# USERS
# ============================================================

@router.get("/users", response_model=list[UserOut])
def get_all_users(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    users = session.exec(
        select(AppUser).where(AppUser.org_id == admin.org_id, AppUser.is_active == True)
        .order_by(AppUser.role, AppUser.name)
    ).all()
    return users


# ============================================================
# SETTINGS
# ============================================================

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


# ============================================================
# DB TOOLS
# ============================================================

@router.post("/seed-dummy")
def seed_dummy_data(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    org_id = str(admin.org_id)
    bos = session.exec(select(AppUser).where(AppUser.role == "contractor", AppUser.org_id == admin.org_id)).first()
    mandor = session.exec(select(AppUser).where(AppUser.role == "mandor", AppUser.org_id == admin.org_id)).first()

    if not bos or not mandor:
        raise HTTPException(status_code=400, detail="Harus ada minimal 1 Bos dan 1 Mandor")

    p_id = str(uuid.uuid4())
    s_id = str(uuid.uuid4())

    sql = text("""
        INSERT INTO project (id, org_id, name, client_name, bos_id, mandor_id, status)
        VALUES (:p_id, CAST(:org_id AS uuid), 'Proyek Dummy', 'Klien Dummy',
                CAST(:bos_id AS uuid), CAST(:mandor_id AS uuid), 'active');

        INSERT INTO site (id, org_id, project_id, name)
        VALUES (:s_id, CAST(:org_id AS uuid), CAST(:p_id AS uuid), 'Titik Dummy');

        INSERT INTO issue (id, org_id, site_id, reported_by, issue_type, urgency, description, status)
        VALUES (gen_random_uuid(), CAST(:org_id AS uuid), CAST(:s_id AS uuid),
                CAST(:mandor_id AS uuid), 'material', 'high', 'Material Dummy Habis', 'open');
    """)
    session.execute(sql, {
        "p_id": p_id, "s_id": s_id, "org_id": org_id,
        "bos_id": str(bos.id), "mandor_id": str(mandor.id)
    })
    session.commit()
    return {"message": "Data dummy berhasil ditanamkan!"}


@router.post("/migrate-db")
def migrate_database(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    """Temporary endpoint to migrate production database schema."""
    try:
        # Add tukang_daily_rate and kuli_daily_rate to project table if they don't exist
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS tukang_daily_rate FLOAT DEFAULT 0.0 NOT NULL;"))
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS kuli_daily_rate FLOAT DEFAULT 0.0 NOT NULL;"))
        
        # Add week_number and weight to target table if they don't exist
        session.execute(text("ALTER TABLE target ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1 NOT NULL;"))
        session.execute(text("ALTER TABLE target ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 0.0 NOT NULL;"))
        
        # Add target_id to daily_report if it doesn't exist
        session.execute(text("ALTER TABLE daily_report ADD COLUMN IF NOT EXISTS target_id UUID;"))
        
        # Create finance_log table if it doesn't exist
        session.execute(text("""
        CREATE TABLE IF NOT EXISTS finance_log (
            id UUID PRIMARY KEY,
            org_id UUID NOT NULL,
            project_id UUID NOT NULL,
            type VARCHAR NOT NULL,
            category VARCHAR NOT NULL,
            amount FLOAT NOT NULL,
            description VARCHAR,
            date DATE NOT NULL,
            recorded_by UUID NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP,
            deleted_at TIMESTAMP
        );
        """))
        
        session.commit()
        return {"message": "Database berhasil dimigrasi! Fitur baru siap digunakan."}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal migrasi database: {str(e)}")


@router.post("/clear-dummy")
def clear_dummy_data(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    org_id = str(admin.org_id)
    sql = text("""
        DELETE FROM audit_log   WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM approval    WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM evidence    WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM issue       WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM daily_report WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM target      WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM finance_log WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM site        WHERE org_id = CAST(:org_id AS uuid);
        DELETE FROM project     WHERE org_id = CAST(:org_id AS uuid);
    """)
    session.execute(sql, {"org_id": org_id})
    session.commit()
    return {"message": "Semua data proyek berhasil dihapus!"}


# ============================================================
# SPY LOGS
# ============================================================

from functools import lru_cache
import urllib.request
import json


@lru_cache(maxsize=1024)
def get_ip_info(ip: str):
    if not ip or ip in ("127.0.0.1", "::1", "localhost") \
            or ip.startswith("172.") or ip.startswith("192.168.") or ip.startswith("10."):
        return {"city": "Lokal/Internal", "isp": "Docker/Localhost"}
    try:
        url = f"http://ip-api.com/json/{ip}?fields=status,country,city,isp"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=2) as response:
            data = json.loads(response.read().decode())
            if data.get("status") == "success":
                city = data.get("city", "Tidak Diketahui")
                country = data.get("country", "")
                isp = data.get("isp", "Tidak Diketahui")
                if country:
                    city = f"{city}, {country}"
                return {"city": city, "isp": isp}
    except Exception:
        pass
    return {"city": "Tidak Diketahui", "isp": "Tidak Diketahui"}


def parse_user_agent(ua_string: str) -> dict:
    if not ua_string:
        return {"device": "Unknown", "os": "Unknown", "browser": "Unknown"}
    ua = ua_string.lower()

    device = "Desktop"
    os_name = "Unknown"
    if "android" in ua:
        device = "Mobile" if "tablet" not in ua and "playbook" not in ua else "Tablet"
        os_name = "Android"
    elif "iphone" in ua:
        device, os_name = "Mobile", "iOS (iPhone)"
    elif "ipad" in ua:
        device, os_name = "Tablet", "iOS (iPad)"
    elif "windows phone" in ua:
        device, os_name = "Mobile", "Windows Phone"
    elif "windows" in ua:
        os_name = "Windows"
    elif "macintosh" in ua or "mac os x" in ua:
        os_name = "Mac OS"
    elif "linux" in ua:
        os_name = "Linux"

    browser = "Unknown Browser"
    if "edg/" in ua or "edge/" in ua:
        browser = "Edge"
    elif "opr/" in ua or "opera/" in ua:
        browser = "Opera"
    elif "chrome" in ua or "crios" in ua:
        browser = "Chrome"
    elif "firefox" in ua or "fxios" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"

    return {"device": device, "os": os_name, "browser": browser}


@router.get("/spy-logs", response_model=list[VisitorLogOut])
def get_spy_logs(
    admin: AppUser = Depends(get_admin_user),
    session: Session = Depends(get_session)
):
    logs = session.exec(
        select(VisitorLog).order_by(VisitorLog.created_at.desc()).limit(100)
    ).all()

    out = []
    for log in logs:
        import datetime as dt_module
        try:
            time_str = (log.created_at + dt_module.timedelta(hours=7)).strftime("%d %b %Y, %H:%M:%S")
        except Exception:
            time_str = str(log.created_at)

        ip_info = get_ip_info(log.ip_address or "")
        ua_info = parse_user_agent(log.user_agent or "")

        out.append(VisitorLogOut(
            id=log.id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            path=log.path,
            created_at=time_str,
            device_type=ua_info["device"],
            os=ua_info["os"],
            browser=ua_info["browser"],
            city=ip_info["city"],
            isp=ip_info["isp"]
        ))
    return out
