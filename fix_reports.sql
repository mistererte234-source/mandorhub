INSERT INTO daily_report (org_id, site_id, mandor_id, report_date, work_done, target_status, submit_status, worker_attendance, submitted_server_at) 
SELECT org_id, site_id, mandor_id, '2026-06-27', 'Lanjut pengecoran tiang dan plester tembok', target_status, submit_status, '[{"role": "tukang", "count": 4, "names": ""}, {"role": "kuli", "count": 3, "names": ""}]'::jsonb, NOW() FROM daily_report WHERE report_date = '2026-06-26' LIMIT 1;

INSERT INTO daily_report (org_id, site_id, mandor_id, report_date, work_done, target_status, submit_status, worker_attendance, submitted_server_at) 
SELECT org_id, site_id, mandor_id, '2026-06-28', 'Mulai pengecatan dan instalasi listrik dasar', target_status, submit_status, '[{"role": "tukang", "count": 4, "names": ""}, {"role": "kuli", "count": 3, "names": ""}]'::jsonb, NOW() FROM daily_report WHERE report_date = '2026-06-26' LIMIT 1;
