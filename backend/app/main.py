from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routers import auth, dashboard, report, issue, site, users, admin, spy, project, finance

app = FastAPI(title="MandorHub API", version="0.1.0")

_origins = ["*"] if settings.cors_origins == "*" else [
    o.strip() for o in settings.cors_origins.split(",")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "traceback": traceback.format_exc()}
    )

@app.get("/api/health", tags=["meta"])
def health():
    return {"ok": True, "service": "mandorhub-api", "version": "0.1.0"}

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(report.router)
app.include_router(issue.router)
app.include_router(site.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(spy.router)
app.include_router(project.router)
app.include_router(finance.router)

from sqlmodel import text
from .core.db import get_session

def seed_gapura_timeline(session):
    import datetime
    import json
    import uuid

    # Find project containing 'gapura'
    project = session.execute(text("SELECT id, org_id FROM project WHERE name ILIKE '%gapura%' AND deleted_at IS NULL LIMIT 1")).fetchone()
    if not project:
        print("Gapura project not found for seeding timeline")
        return
        
    p_id = project[0]
    org_id = project[1]
    
    # Find site for project
    site = session.execute(text("SELECT id, assigned_mandor_id FROM site WHERE project_id = :p_id AND deleted_at IS NULL LIMIT 1"), {"p_id": p_id}).fetchone()
    if not site:
        print("Site not found for Gapura project, creating one")
        # Create site
        s_id = uuid.uuid4()
        # Find any mandor in org
        mandor_row = session.execute(text("SELECT id FROM app_user WHERE org_id = :org_id AND role = 'mandor' LIMIT 1"), {"org_id": org_id}).fetchone()
        m_id = mandor_row[0] if mandor_row else None
        session.execute(text("""
            INSERT INTO site (id, org_id, project_id, name, assigned_mandor_id)
            VALUES (:s_id, :org_id, :p_id, 'Titik Utama', :m_id)
        """), {"s_id": s_id, "org_id": org_id, "p_id": p_id, "m_id": m_id})
        site = (s_id, m_id)
        
    s_id = site[0]
    m_id = site[1]
    
    # Find mandor named Djanky
    djanky = session.execute(text("SELECT id FROM app_user WHERE name ILIKE '%djanky%' AND role = 'mandor' LIMIT 1")).fetchone()
    if djanky:
        m_id = djanky[0]
        # Update site mandor assignment
        session.execute(text("UPDATE site SET assigned_mandor_id = :m_id WHERE id = :s_id"), {"m_id": m_id, "s_id": s_id})
    elif not m_id:
        # Fallback to any mandor
        mandor_row = session.execute(text("SELECT id FROM app_user WHERE org_id = :org_id AND role = 'mandor' LIMIT 1"), {"org_id": org_id}).fetchone()
        m_id = mandor_row[0] if mandor_row else None
        if m_id:
            session.execute(text("UPDATE site SET assigned_mandor_id = :m_id WHERE id = :s_id"), {"m_id": m_id, "s_id": s_id})

    if not m_id:
        print("No mandor found in organization to assign daily reports")
        return

    # Delete existing targets and reports to allow safe re-run
    session.execute(text("DELETE FROM daily_report WHERE site_id = :s_id"), {"s_id": s_id})
    session.execute(text("DELETE FROM target WHERE site_id = :s_id"), {"s_id": s_id})

    timeline = [
        ("2026-06-02", 0, 1, "Pembersihan Area"),
        ("2026-06-03", 1, 1, "Pembongkaran & Galian"),
        ("2026-06-04", 1, 2, "Pengecoran Sepatu"),
        ("2026-06-05", 1, 1, "Perapian Cor dan pondasi"),
        ("2026-06-06", 2, 1, "Finishing pondasi Gapura"),
        ("2026-06-07", 0, 0, "Libur"),
        ("2026-06-08", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-09", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-10", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-11", 1, 1, "Lanjut pos"),
        ("2026-06-12", 1, 1, "Lanjut pos"),
        ("2026-06-13", 1, 1, "Lanjut pos"),
        ("2026-06-14", 0, 0, "Libur"),
        ("2026-06-15", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-16", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-17", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-18", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-19", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-20", 2, 2, "Lanjut pos dan gapura"),
        ("2026-06-21", 0, 0, "Libur"),
        ("2026-06-22", 3, 2, "Lanjut pos dan gapura"),
        ("2026-06-23", 3, 2, "Lanjut pos dan gapura"),
        ("2026-06-24", 3, 2, "Lanjut pos dan gapura"),
        ("2026-06-25", 3, 2, "Lanjut pos dan gapura"),
        ("2026-06-26", 3, 2, "Lanjut pos dan gapura")
    ]

    for date_str, tukang, kuli, progress in timeline:
        t_id = uuid.uuid4()
        dr_id = uuid.uuid4()
        
        # Insert target
        status = "done" if progress != "Libur" else "pending"
        session.execute(text("""
            INSERT INTO target (id, org_id, site_id, title, period_type, due_date, status)
            VALUES (:t_id, :org_id, :s_id, :title, 'daily', :due_date, :status)
        """), {
            "t_id": t_id,
            "org_id": org_id,
            "s_id": s_id,
            "title": progress,
            "due_date": date_str,
            "status": status
        })
        
        # Prepare worker attendance
        attendance = []
        if tukang > 0:
            attendance.append({"role": "tukang", "count": tukang, "names": ""})
        if kuli > 0:
            attendance.append({"role": "kuli", "count": kuli, "names": ""})
            
        target_status = "tercapai" if progress != "Libur" else "belum"
        
        # Insert daily report
        session.execute(text("""
            INSERT INTO daily_report (id, org_id, site_id, mandor_id, report_date, target_id, work_done, target_status, worker_attendance, submit_status, submitted_server_at)
            VALUES (:dr_id, :org_id, :s_id, :m_id, :report_date, :t_id, :work_done, :target_status, :worker_attendance, 'submitted', :sub_at)
        """), {
            "dr_id": dr_id,
            "org_id": org_id,
            "s_id": s_id,
            "m_id": m_id,
            "report_date": date_str,
            "t_id": t_id,
            "work_done": progress,
            "target_status": target_status,
            "worker_attendance": json.dumps(attendance),
            "sub_at": datetime.datetime.now(datetime.timezone.utc)
        })

    session.commit()
    print("Successfully seeded Gapura project timeline")

@app.on_event("startup")
def on_startup():
    session = next(get_session())
    try:
        session.execute(text("""
            ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
            ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('contractor', 'mandor', 'admin', 'bendahara'));
            ALTER TABLE project ADD COLUMN IF NOT EXISTS assigned_bendahara_id uuid REFERENCES app_user(id);
        """))
        session.commit()
        print("Successfully updated app_user role check constraint & project columns")
        
        # Seed Gapura project timeline
        seed_gapura_timeline(session)
    except Exception as e:
        print("Failed to run startup migrations:", e)
    finally:
        session.close()
