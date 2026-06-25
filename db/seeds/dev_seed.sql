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

-- ---------- Projects ----------
INSERT INTO project (id, org_id, name, client_name, address_short, status, start_date, target_end_date, created_by) VALUES
 ('c1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ruko Pak Budi',      'Budi Santoso',  'Jl. Rungkut, Surabaya',       'active', current_date - 30, current_date + 60, 'b1000000-0000-0000-0000-000000000001'),
 ('c1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Rumah Gresik',       'Hj. Aminah',    'Jl. Veteran, Gresik',         'active', current_date - 15, current_date + 45, 'b1000000-0000-0000-0000-000000000001'),
 ('c1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Perumahan Sidoarjo', 'PT Griya Asri', 'Jl. Raya Buduran, Sidoarjo',  'active', current_date - 7,  current_date + 90, 'b1000000-0000-0000-0000-000000000001');

-- ---------- Sites (Titik) ----------
-- Slamet -> 2 titik Surabaya ; Joko -> Gresik + Sidoarjo
INSERT INTO site (id, org_id, project_id, name, address, geo, geo_radius_m, assigned_mandor_id) VALUES
 ('d1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Titik C',      'Rungkut, Surabaya',  ST_SetSRID(ST_MakePoint(112.7508, -7.2575), 4326)::geography, 150, 'b1000000-0000-0000-0000-000000000002'),
 ('d1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Titik D',      'Rungkut, Surabaya',  ST_SetSRID(ST_MakePoint(112.7515, -7.2580), 4326)::geography, 150, 'b1000000-0000-0000-0000-000000000002'),
 ('d1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Rumah Gresik', 'Veteran, Gresik',    ST_SetSRID(ST_MakePoint(112.6510, -7.1550), 4326)::geography, 150, 'b1000000-0000-0000-0000-000000000003'),
 ('d1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Blok A',       'Buduran, Sidoarjo',  ST_SetSRID(ST_MakePoint(112.7180, -7.4470), 4326)::geography, 200, 'b1000000-0000-0000-0000-000000000003');

-- ---------- Targets ----------
INSERT INTO target (id, org_id, site_id, title, description, period_type, due_date, status, created_by) VALUES
 ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'Pasang keramik lantai 1', 'Area depan & tengah',     'daily',  current_date,     'in_progress', 'b1000000-0000-0000-0000-000000000001'),
 ('e1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'Cor dak lantai 2',        'Tertunda, besi belum ada', 'daily',  current_date - 1, 'blocked',     'b1000000-0000-0000-0000-000000000001'),
 ('e1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'Plester dinding belakang','Sisi utara & timur',       'weekly', current_date + 3, 'in_progress', 'b1000000-0000-0000-0000-000000000001'),
 ('e1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'Galian pondasi blok A',   'Mulai dari sudut barat',   'daily',  current_date,     'pending',     'b1000000-0000-0000-0000-000000000001');

-- ---------- Daily Reports ----------
-- (1) Titik C — KEMARIN, submitted+locked, target tercapai
INSERT INTO daily_report (id, org_id, site_id, target_id, mandor_id, report_date, worker_attendance, work_done, target_status, note, submit_status, client_created_at, submitted_server_at, locked) VALUES
 ('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002',
  current_date - 1, '[{"role": "Tukang", "count": 2}, {"role": "Kuli", "count": 4}]'::jsonb, 'Pasang keramik area depan', 'tercapai', 'Lancar, material cukup', 'submitted', now() - interval '1 day', now() - interval '1 day', true);

-- (2) Rumah Gresik — HARI INI, submitted+locked, target belum
INSERT INTO daily_report (id, org_id, site_id, target_id, mandor_id, report_date, worker_attendance, work_done, target_status, note, submit_status, client_created_at, submitted_server_at, locked) VALUES
 ('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000003',
  current_date, '[{"role": "Tukang", "count": 1}, {"role": "Kuli", "count": 3}]'::jsonb, 'Plester dinding sisi utara', 'belum', 'Kurang 1 sak semen', 'submitted', now(), now(), true);

-- (3) Titik D — HARI INI, DRAFT (offline, belum terkirim) -> demonstrasi queue offline
INSERT INTO daily_report (id, org_id, site_id, target_id, mandor_id, report_date, worker_attendance, work_done, target_status, note, submit_status, client_created_at, locked) VALUES
 ('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002',
  current_date, '[{"role": "Tukang", "count": 1}, {"role": "Kuli", "count": 2}]'::jsonb, 'Persiapan bekisting', 'belum', 'Nunggu kiriman besi', 'draft', now(), false);

-- ---------- Evidence untuk laporan ----------
-- Titik C: 1 foto kamera (di lokasi -> gps_validated true) + 1 dari galeri (tanpa gps)
INSERT INTO evidence (id, org_id, report_id, media_type, storage_url, thumbnail_url, capture_source, gps, caption) VALUES
 ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'photo', 's3://seed/c-progress.jpg', 's3://seed/c-progress_thumb.jpg', 'camera_live', ST_SetSRID(ST_MakePoint(112.7509, -7.2576), 4326)::geography, 'Keramik area depan'),
 ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 'photo', 's3://seed/c-nota.jpg',     's3://seed/c-nota_thumb.jpg',     'gallery',     NULL,                                                          'Nota pembelian keramik'),
 ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000002', 'photo', 's3://seed/g-dinding.jpg',  's3://seed/g-dinding_thumb.jpg',  'camera_live', ST_SetSRID(ST_MakePoint(112.6511, -7.1551), 4326)::geography, 'Plesteran dinding utara');

-- ---------- Issues ----------
-- (A) Titik D: material habis -> sudah diputus (decided)
INSERT INTO issue (id, org_id, site_id, reported_by, issue_type, urgency, description, status) VALUES
 ('15000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000002', 'material', 'high', 'Besi 10mm habis, pekerjaan cor dak tertunda', 'decided');

-- (B) Sidoarjo: cuaca -> masih OPEN (butuh keputusan kontraktor) -> bikin titik MERAH di dashboard
INSERT INTO issue (id, org_id, site_id, reported_by, issue_type, urgency, description, status) VALUES
 ('15000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003', 'cuaca', 'high', 'Hujan deras, galian pondasi tergenang air', 'open');

-- Evidence untuk issue material
INSERT INTO evidence (id, org_id, issue_id, media_type, storage_url, capture_source, gps, caption) VALUES
 ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'photo', 's3://seed/issue-besi.jpg', 'camera_live', ST_SetSRID(ST_MakePoint(112.7516, -7.2581), 4326)::geography, 'Stok besi kosong');

-- ---------- Approval (untuk issue yang decided) ----------
INSERT INTO approval (id, org_id, issue_id, decision, note, decided_by) VALUES
 ('a5000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '15000000-0000-0000-0000-000000000001', 'setuju', 'Beli besi 10mm 20 batang, talangin dulu nanti diganti', 'b1000000-0000-0000-0000-000000000001');

-- ---------- Audit log (contoh jejak) ----------
INSERT INTO audit_log (org_id, actor_user_id, action, entity_type, entity_id, metadata) VALUES
 ('a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'report.submitted', 'daily_report', 'f1000000-0000-0000-0000-000000000001', '{"site":"Titik C"}'),
 ('a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'report.submitted', 'daily_report', 'f1000000-0000-0000-0000-000000000002', '{"site":"Rumah Gresik"}'),
 ('a0000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'issue.decided',    'issue',        '15000000-0000-0000-0000-000000000001', '{"decision":"setuju"}');

COMMIT;
