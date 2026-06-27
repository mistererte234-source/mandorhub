from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .routers import auth, dashboard, report, issue, site, users, admin, spy, project, finance, target

app = FastAPI(title="MandorHub API", version="2.0.0")

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
    return {"ok": True, "service": "mandorhub-api", "version": "2.0.0"}


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
app.include_router(target.router)

from sqlmodel import text
from .core.db import get_session


def seed_gapura_timeline(session):
    """Seed timeline Gapura Airlangga dari project.mandor_id (bukan site.assigned_mandor_id)."""
    import datetime
    import json
    import uuid as _uuid

    project = session.execute(
        text("SELECT id, org_id, mandor_id, bos_id FROM project WHERE name ILIKE '%gapura%' AND deleted_at IS NULL LIMIT 1")
    ).fetchone()
    if not project:
        print("Gapura project not found for seeding timeline")
        return

    p_id    = project[0]
    org_id  = project[1]
    m_id    = project[2]   # langsung dari project.mandor_id
    bos_id  = project[3]

    # Ambil atau buat site untuk proyek ini
    site_row = session.execute(
        text("SELECT id FROM site WHERE project_id = :p_id AND deleted_at IS NULL LIMIT 1"),
        {"p_id": p_id}
    ).fetchone()

    if not site_row:
        s_id = _uuid.uuid4()
        session.execute(
            text("INSERT INTO site (id, org_id, project_id, name) VALUES (:s_id, :org_id, :p_id, 'Titik Utama')"),
            {"s_id": s_id, "org_id": org_id, "p_id": p_id}
        )
    else:
        s_id = site_row[0]

    # Jika proyek legacy belum punya bos/mandor, pasang otomatis
    if not m_id or not bos_id:
        bos_row = session.execute(text("SELECT id FROM app_user WHERE org_id = :org_id AND role = 'contractor' LIMIT 1"), {"org_id": org_id}).fetchone()
        mandor_row = session.execute(text("SELECT id FROM app_user WHERE org_id = :org_id AND role = 'mandor' LIMIT 1"), {"org_id": org_id}).fetchone()
        bendahara_row = session.execute(text("SELECT id FROM app_user WHERE org_id = :org_id AND role = 'bendahara' LIMIT 1"), {"org_id": org_id}).fetchone()
        
        if bos_row and mandor_row:
            bos_id = bos_row[0]
            m_id = mandor_row[0]
            bend_id = bendahara_row[0] if bendahara_row else None
            session.execute(text("UPDATE project SET bos_id = :b, mandor_id = :m, bendahara_id = :bend WHERE id = :p"), 
                {"b": bos_id, "m": m_id, "bend": bend_id, "p": p_id})
            session.commit()
        else:
            print("Belum ada Bos atau Mandor di Org ini, Gapura tidak bisa di-seed")
            return

    # Hapus data lama agar safe re-run
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
        ("2026-06-26", 3, 2, "Lanjut pos dan gapura"),
    ]

    for date_str, tukang, kuli, progress in timeline:
        t_id  = _uuid.uuid4()
        dr_id = _uuid.uuid4()
        is_libur = (progress == "Libur")

        session.execute(text("""
            INSERT INTO target (id, org_id, site_id, title, period_type, due_date, status)
            VALUES (:t_id, :org_id, :s_id, :title, 'daily', :due_date, :status)
        """), {
            "t_id": t_id, "org_id": org_id, "s_id": s_id,
            "title": progress, "due_date": date_str,
            "status": "done" if not is_libur else "pending"
        })

        attendance = []
        if tukang > 0:
            attendance.append({"role": "tukang", "count": tukang, "names": ""})
        if kuli > 0:
            attendance.append({"role": "kuli", "count": kuli, "names": ""})

        session.execute(text("""
            INSERT INTO daily_report
              (id, org_id, site_id, mandor_id, report_date, target_id,
               work_done, target_status, worker_attendance, submit_status, submitted_server_at)
            VALUES
              (:dr_id, :org_id, :s_id, :m_id, :report_date, :t_id,
               :work_done, :target_status, :worker_attendance, 'submitted', :sub_at)
        """), {
            "dr_id": dr_id, "org_id": org_id, "s_id": s_id,
            "m_id": m_id, "report_date": date_str, "t_id": t_id,
            "work_done": progress,
            "target_status": "tercapai" if not is_libur else "belum",
            "worker_attendance": json.dumps(attendance),
            "sub_at": datetime.datetime.now(datetime.timezone.utc)
        })

    session.commit()
    print("Successfully seeded Gapura project timeline")


@app.on_event("startup")
def on_startup():
    session = next(get_session())
    try:
        # Auto-migrate production schema
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS bos_id UUID;"))
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS mandor_id UUID;"))
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS bendahara_id UUID;"))
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS tukang_daily_rate FLOAT DEFAULT 0.0 NOT NULL;"))
        session.execute(text("ALTER TABLE project ADD COLUMN IF NOT EXISTS kuli_daily_rate FLOAT DEFAULT 0.0 NOT NULL;"))
        session.execute(text("ALTER TABLE target ADD COLUMN IF NOT EXISTS week_number INTEGER DEFAULT 1 NOT NULL;"))
        session.execute(text("ALTER TABLE target ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 0.0 NOT NULL;"))
        session.execute(text("ALTER TABLE daily_report ADD COLUMN IF NOT EXISTS target_id UUID;"))
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
        
        seed_gapura_timeline(session)
    except Exception as e:
        print("Failed to seed Gapura timeline:", e)
    finally:
        session.close()
