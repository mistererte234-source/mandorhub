-- ============================================================================
-- MandorHub — Migration 0001 (init)
-- Source of truth: docs/MandorHub_Data_Model_v1.md
--
-- Target: PostgreSQL 14+ with PostGIS.
-- Conventions baked in:
--   * UUID PK (gen_random_uuid) — boleh dibuat di client untuk offline draft.
--   * org_id di semua tabel inti (internal sekarang, SaaS tinggal "dinyalakan").
--   * Waktu tepercaya = kolom *_server_at (default now()), bukan dari client.
--   * GPS tepercaya = evidence.gps_validated dihitung server (PostGIS trigger).
--   * daily_report & evidence IMMUTABLE setelah submit (trigger).
--   * audit_log append-only (trigger blokir UPDATE/DELETE).
--
-- Catatan koreksi:
--   * Tabel "user" -> "app_user" (user = reserved keyword di Postgres).
--   * updated_at ditambahkan pada tabel mutable (auto via trigger) untuk sync.
-- ============================================================================

BEGIN;

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- geography(Point)

-- ---------- Helper: auto set updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. organization (tenant / kontraktor)
-- ============================================================================
CREATE TABLE organization (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    owner_user_id   uuid,                              -- FK ditambah setelah app_user dibuat
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organization_updated
    BEFORE UPDATE ON organization
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 2. app_user  (login via OTP nomor HP)
-- ============================================================================
CREATE TABLE app_user (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organization(id),
    name        text NOT NULL,
    phone       text NOT NULL,
    role        text NOT NULL CHECK (role IN ('contractor','mandor','admin','bendahara')),
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_app_user_org_phone UNIQUE (org_id, phone)
);

CREATE TRIGGER trg_app_user_updated
    BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- now wire organization.owner_user_id -> app_user
ALTER TABLE organization
    ADD CONSTRAINT fk_organization_owner
    FOREIGN KEY (owner_user_id) REFERENCES app_user(id);

-- ============================================================================
-- 3. project
-- ============================================================================
CREATE TABLE project (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid NOT NULL REFERENCES organization(id),
    name            text NOT NULL,
    client_name     text,
    address_short   text,
    status          text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','paused','done')),
    start_date      date,
    target_end_date date,
    created_by      uuid REFERENCES app_user(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE TRIGGER trg_project_updated
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. site (Titik)
-- ============================================================================
CREATE TABLE site (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    project_id          uuid NOT NULL REFERENCES project(id),
    name                text NOT NULL,
    address             text,
    geo                 geography(Point,4326),          -- lokasi titik (opsional)
    geo_radius_m        integer NOT NULL DEFAULT 150,    -- toleransi validasi GPS
    assigned_mandor_id  uuid REFERENCES app_user(id),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE TRIGGER trg_site_updated
    BEFORE UPDATE ON site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 5. target  (entitas yang hilang di proposal asli)
--    "Tugas mingguan" P1 dilayani entitas yang sama via period_type='weekly'.
-- ============================================================================
CREATE TABLE target (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organization(id),
    site_id     uuid NOT NULL REFERENCES site(id),
    title       text NOT NULL,
    description text,
    period_type text NOT NULL DEFAULT 'daily'
                    CHECK (period_type IN ('daily','weekly')),
    due_date    date,
    status      text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','in_progress','done','blocked')),
    created_by  uuid REFERENCES app_user(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

CREATE TRIGGER trg_target_updated
    BEFORE UPDATE ON target
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 6. issue (Ada Masalah)  — "Material Kurang" = issue_type='material'
-- ============================================================================
CREATE TABLE issue (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    site_id             uuid NOT NULL REFERENCES site(id),
    reported_by         uuid NOT NULL REFERENCES app_user(id),
    issue_type          text NOT NULL
                            CHECK (issue_type IN ('material','pekerja','cuaca','desain','biaya','lain')),
    urgency             text NOT NULL DEFAULT 'medium'
                            CHECK (urgency IN ('low','medium','high')),
    description         text,
    status              text NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','decided','resolved','closed')),
    reported_server_at  timestamptz NOT NULL DEFAULT now(),  -- waktu tepercaya
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE TRIGGER trg_issue_updated
    BEFORE UPDATE ON issue
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. daily_report  — IMMUTABLE setelah submit (locked=true)
-- ============================================================================
CREATE TABLE daily_report (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),  -- bisa di-generate client
    org_id                uuid NOT NULL REFERENCES organization(id),
    site_id               uuid NOT NULL REFERENCES site(id),
    target_id             uuid REFERENCES target(id),
    mandor_id             uuid NOT NULL REFERENCES app_user(id),
    report_date           date NOT NULL,
    worker_attendance     jsonb,
    work_done             text,
    target_status         text CHECK (target_status IN ('tercapai','belum')),
    note                  text,
    voice_note_url        text,
    submit_status         text NOT NULL DEFAULT 'draft'
                              CHECK (submit_status IN ('draft','queued','submitted')),
    client_created_at     timestamptz,                 -- waktu HP (referensi saja)
    submitted_server_at   timestamptz,                 -- waktu tepercaya (di-set saat ack)
    supersedes_report_id  uuid REFERENCES daily_report(id),
    locked                boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    deleted_at            timestamptz
);

-- 1 laporan "asli" per titik per hari (koreksi via supersedes diizinkan)
CREATE UNIQUE INDEX uq_daily_report_site_date
    ON daily_report (site_id, report_date)
    WHERE supersedes_report_id IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- 8. evidence  — IMMUTABLE. Nempel ke daily_report ATAU issue (salah satu wajib)
-- ============================================================================
CREATE TABLE evidence (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    report_id           uuid REFERENCES daily_report(id),
    issue_id            uuid REFERENCES issue(id),
    media_type          text NOT NULL CHECK (media_type IN ('photo','video')),
    storage_url         text NOT NULL,
    thumbnail_url       text,                            -- derivasi deterministik dari storage_url
    capture_source      text NOT NULL DEFAULT 'camera_live'
                            CHECK (capture_source IN ('camera_live','gallery')),
    gps                 geography(Point,4326),
    gps_validated       boolean,                         -- dihitung server (trigger, NULL = tak bisa dinilai)
    uploaded_server_at  timestamptz NOT NULL DEFAULT now(),  -- waktu tepercaya
    caption             text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT chk_evidence_parent CHECK (report_id IS NOT NULL OR issue_id IS NOT NULL)
);

-- ============================================================================
-- 9. approval (keputusan kontraktor) — 1:1 dengan issue
-- ============================================================================
CREATE TABLE approval (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    issue_id            uuid NOT NULL UNIQUE REFERENCES issue(id),
    decision            text NOT NULL
                            CHECK (decision IN ('setuju','tunda','hubungi_saya')),
    note                text,
    decided_by          uuid NOT NULL REFERENCES app_user(id),
    decided_server_at   timestamptz NOT NULL DEFAULT now(),  -- waktu tepercaya
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. audit_log  — append-only
-- ============================================================================
CREATE TABLE audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid NOT NULL REFERENCES organization(id),
    actor_user_id   uuid REFERENCES app_user(id),
    action          text NOT NULL,                      -- mis. 'report.submitted'
    entity_type     text NOT NULL,                      -- 'daily_report', 'issue', ...
    entity_id       uuid,
    metadata        jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRUST ENFORCEMENT (triggers)
-- ============================================================================

-- (a) daily_report: tolak SEMUA perubahan setelah row terkunci.
--     Transisi submit (locked false->true) tetap diizinkan.
CREATE OR REPLACE FUNCTION enforce_daily_report_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD.locked THEN
    RAISE EXCEPTION 'daily_report % sudah terkunci (immutable). Koreksi via record baru + supersedes_report_id.', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_report_immutable
    BEFORE UPDATE ON daily_report
    FOR EACH ROW EXECUTE FUNCTION enforce_daily_report_immutable();

-- (b) evidence: hitung gps_validated di server saat INSERT, lalu kunci penuh.
CREATE OR REPLACE FUNCTION compute_evidence_gps_validated()
RETURNS trigger AS $$
DECLARE
  v_site_id uuid;
  v_geo     geography(Point,4326);
  v_radius  integer;
BEGIN
  IF NEW.gps IS NOT NULL THEN
    -- resolve site dari report atau issue
    IF NEW.report_id IS NOT NULL THEN
      SELECT s.id, s.geo, s.geo_radius_m INTO v_site_id, v_geo, v_radius
      FROM daily_report r JOIN site s ON s.id = r.site_id
      WHERE r.id = NEW.report_id;
    ELSIF NEW.issue_id IS NOT NULL THEN
      SELECT s.id, s.geo, s.geo_radius_m INTO v_site_id, v_geo, v_radius
      FROM issue i JOIN site s ON s.id = i.site_id
      WHERE i.id = NEW.issue_id;
    END IF;

    IF v_geo IS NOT NULL THEN
      NEW.gps_validated := ST_DWithin(NEW.gps, v_geo, COALESCE(v_radius,150));
    ELSE
      NEW.gps_validated := NULL;  -- site tak punya koordinat -> tak bisa dinilai
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidence_gps
    BEFORE INSERT ON evidence
    FOR EACH ROW EXECUTE FUNCTION compute_evidence_gps_validated();

CREATE OR REPLACE FUNCTION enforce_evidence_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evidence % immutable. Koreksi = evidence baru.', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidence_immutable
    BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION enforce_evidence_immutable();

-- (c) audit_log: append-only (blokir UPDATE & DELETE).
CREATE OR REPLACE FUNCTION enforce_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log bersifat append-only (% ditolak).', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE OR DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION enforce_append_only();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_app_user_org            ON app_user    (org_id);
CREATE INDEX idx_project_org             ON project     (org_id);
CREATE INDEX idx_site_org_project        ON site        (org_id, project_id);
CREATE INDEX idx_site_mandor             ON site        (assigned_mandor_id);
CREATE INDEX idx_site_geo                ON site        USING gist (geo);
CREATE INDEX idx_target_org_site_due     ON target      (org_id, site_id, due_date);
CREATE INDEX idx_issue_org_status_site   ON issue       (org_id, status, site_id);
CREATE INDEX idx_daily_report_org_site_d ON daily_report(org_id, site_id, report_date);
CREATE INDEX idx_daily_report_submit     ON daily_report(org_id, submit_status);
CREATE INDEX idx_evidence_report         ON evidence    (org_id, report_id);
CREATE INDEX idx_evidence_issue          ON evidence    (org_id, issue_id);
CREATE INDEX idx_audit_org_created       ON audit_log   (org_id, created_at);

COMMIT;

-- ============================================================================
-- ROLLBACK (jalankan manual kalau perlu turun)
-- ============================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS audit_log, approval, evidence, daily_report,
--   issue, target, site, project, app_user, organization CASCADE;
-- DROP FUNCTION IF EXISTS set_updated_at, enforce_daily_report_immutable,
--   compute_evidence_gps_validated, enforce_evidence_immutable, enforce_append_only CASCADE;
-- COMMIT;
