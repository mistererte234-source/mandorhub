-- ============================================================================
-- MandorHub — Dev Seed
-- Jalankan SETELAH 0001_init.sql. Idempotent: TRUNCATE dulu, lalu insert ulang.
--
-- Isi: 1 kontraktor (Pak Hadi) + 2 mandor (Slamet, Joko),
--      3 proyek (Surabaya/Gresik/Sidoarjo), 4 titik, target, laporan,
--      evidence (camera_live & gallery), issue (decided & open), approval.
--
-- UUID sengaja fixed biar gampang direferensikan & re-runnable.
-- Konvensi: a0=org  b1=user  c1=project  d1=site  e1=target
--           f1=daily_report  e0=evidence  15=issue  a5=approval
-- ============================================================================

BEGIN;

-- Reset (TRUNCATE bypass trigger immutable/append-only, aman untuk dev)
TRUNCATE organization, app_user, project, site, target,
         daily_report, evidence, issue, approval, audit_log
         RESTART IDENTITY CASCADE;

-- ---------- Organization ----------
INSERT INTO organization (id, name) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'CV Karya Hadi');

-- ---------- Users: 1 contractor + 2 mandor ----------
INSERT INTO app_user (id, org_id, name, phone, role) VALUES
 ('b1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Pak Hadi',   '+628110000001', 'contractor'),
 ('b1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Pak Slamet', '+628220000002', 'mandor'),
 ('b1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Pak Joko',   '+628330000003', 'mandor');

UPDATE organization
   SET owner_user_id = 'b1000000-0000-0000-0000-000000000001'
 WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- (Hanya seed user, proyek dihapus agar bisa diisi data asli)

COMMIT;
