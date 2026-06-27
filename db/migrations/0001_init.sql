-- ============================================================================
-- MandorHub — Migration 0001 (init) — v2
-- Struktur bersih: project punya bos_id, mandor_id, bendahara_id eksplisit.
-- ============================================================================

BEGIN;

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------- Helper: auto set updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. organization
-- ============================================================================
CREATE TABLE organization (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
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

-- ============================================================================
-- 3. project  (bos, mandor, bendahara langsung di sini)
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
    -- Penugasan eksplisit
    bos_id          uuid NOT NULL REFERENCES app_user(id),
    mandor_id       uuid NOT NULL REFERENCES app_user(id),
    bendahara_id    uuid REFERENCES app_user(id),   -- nullable/opsional
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE TRIGGER trg_project_updated
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. site (Titik) — entitas internal, auto-created 1 per project
-- ============================================================================
CREATE TABLE site (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organization(id),
    project_id  uuid NOT NULL REFERENCES project(id),
    name        text NOT NULL DEFAULT 'Titik Utama',
    address     text,
    geo         geography(Point,4326),
    geo_radius_m integer NOT NULL DEFAULT 150,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

CREATE TRIGGER trg_site_updated
    BEFORE UPDATE ON site
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 5. target
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
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

CREATE TRIGGER trg_target_updated
    BEFORE UPDATE ON target
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 6. issue
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
    reported_server_at  timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz
);

CREATE TRIGGER trg_issue_updated
    BEFORE UPDATE ON issue
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 7. daily_report
-- ============================================================================
CREATE TABLE daily_report (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                uuid NOT NULL REFERENCES organization(id),
    site_id               uuid NOT NULL REFERENCES site(id),
    target_id             uuid REFERENCES target(id),
    mandor_id             uuid NOT NULL REFERENCES app_user(id),
    report_date           date NOT NULL,
    worker_attendance     jsonb,
    work_done             text,
    target_status         text CHECK (target_status IN ('tercapai','belum')),
    note                  text,
    submit_status         text NOT NULL DEFAULT 'draft'
                              CHECK (submit_status IN ('draft','queued','submitted')),
    submitted_server_at   timestamptz,
    supersedes_report_id  uuid REFERENCES daily_report(id),
    locked                boolean NOT NULL DEFAULT false,
    created_at            timestamptz NOT NULL DEFAULT now(),
    deleted_at            timestamptz
);

CREATE UNIQUE INDEX uq_daily_report_site_date
    ON daily_report (site_id, report_date)
    WHERE supersedes_report_id IS NULL AND deleted_at IS NULL;

-- ============================================================================
-- 8. evidence
-- ============================================================================
CREATE TABLE evidence (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    report_id           uuid REFERENCES daily_report(id),
    issue_id            uuid REFERENCES issue(id),
    media_type          text NOT NULL CHECK (media_type IN ('photo','video')),
    storage_url         text NOT NULL,
    thumbnail_url       text,
    capture_source      text NOT NULL DEFAULT 'camera_live'
                            CHECK (capture_source IN ('camera_live','gallery')),
    gps                 geography(Point,4326),
    gps_validated       boolean,
    uploaded_server_at  timestamptz NOT NULL DEFAULT now(),
    caption             text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT chk_evidence_parent CHECK (report_id IS NOT NULL OR issue_id IS NOT NULL)
);

-- ============================================================================
-- 9. approval
-- ============================================================================
CREATE TABLE approval (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id              uuid NOT NULL REFERENCES organization(id),
    issue_id            uuid NOT NULL UNIQUE REFERENCES issue(id),
    decision            text NOT NULL
                            CHECK (decision IN ('setuju','tunda','hubungi_saya')),
    note                text,
    decided_by          uuid NOT NULL REFERENCES app_user(id),
    decided_server_at   timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 10. audit_log
-- ============================================================================
CREATE TABLE audit_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          uuid NOT NULL REFERENCES organization(id),
    actor_user_id   uuid REFERENCES app_user(id),
    action          text NOT NULL,
    entity_type     text NOT NULL,
    entity_id       uuid,
    metadata        jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 11. app_setting (password admin, dll)
-- ============================================================================
CREATE TABLE app_setting (
    key         text PRIMARY KEY,
    value       text NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 12. visitor_log (spy)
-- ============================================================================
CREATE TABLE visitor_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address  text,
    user_agent  text,
    path        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 13. finance_log
-- ============================================================================
CREATE TABLE finance_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      uuid NOT NULL REFERENCES organization(id),
    project_id  uuid NOT NULL REFERENCES project(id),
    type        text NOT NULL DEFAULT 'out' CHECK (type IN ('in','out')),
    category    text NOT NULL,
    amount      numeric(15,2) NOT NULL DEFAULT 0,
    description text,
    date        date NOT NULL,
    recorded_by uuid NOT NULL REFERENCES app_user(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted_at  timestamptz
);

-- ============================================================================
-- TRIGGERS: immutability
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_daily_report_immutable()
RETURNS trigger AS $$
BEGIN
  IF OLD.locked THEN
    RAISE EXCEPTION 'daily_report % sudah terkunci (immutable).', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_daily_report_immutable
    BEFORE UPDATE ON daily_report
    FOR EACH ROW EXECUTE FUNCTION enforce_daily_report_immutable();

CREATE OR REPLACE FUNCTION enforce_evidence_immutable()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'evidence % immutable.', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evidence_immutable
    BEFORE UPDATE ON evidence
    FOR EACH ROW EXECUTE FUNCTION enforce_evidence_immutable();

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
CREATE INDEX idx_app_user_org         ON app_user    (org_id);
CREATE INDEX idx_project_org          ON project     (org_id);
CREATE INDEX idx_project_bos          ON project     (bos_id);
CREATE INDEX idx_project_mandor       ON project     (mandor_id);
CREATE INDEX idx_project_bendahara    ON project     (bendahara_id);
CREATE INDEX idx_site_org_project     ON site        (org_id, project_id);
CREATE INDEX idx_target_site_due      ON target      (site_id, due_date);
CREATE INDEX idx_issue_org_status     ON issue       (org_id, status, site_id);
CREATE INDEX idx_daily_report_site_d  ON daily_report(site_id, report_date);
CREATE INDEX idx_finance_project      ON finance_log (org_id, project_id);
CREATE INDEX idx_audit_org_created    ON audit_log   (org_id, created_at);

COMMIT;
