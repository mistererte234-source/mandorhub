-- ============================================================================
-- MandorHub — Migration 0002
-- Menambahkan Pengaturan Aplikasi, Log Pengunjung (Mata-mata), dan Akun Super Admin.
-- ============================================================================

BEGIN;

-- 1. Tabel Pengaturan Aplikasi (AppSetting)
CREATE TABLE IF NOT EXISTS app_setting (
    key text PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger auto-update (menggunakan fungsi set_updated_at dari migrasi 0001)
DROP TRIGGER IF EXISTS trg_app_setting_updated ON app_setting;
CREATE TRIGGER trg_app_setting_updated
    BEFORE UPDATE ON app_setting
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Insert password default jika belum ada
INSERT INTO app_setting (key, value) 
VALUES ('admin_password', 'password123')
ON CONFLICT (key) DO NOTHING;

-- 2. Tabel Log Pengunjung (VisitorLog)
CREATE TABLE IF NOT EXISTS visitor_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address text,
    user_agent text,
    path text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Akun Super Admin
-- Pastikan organisasi pertama ada, lalu buat akun admin.
DO $$ 
DECLARE 
    v_org_id uuid;
BEGIN
    SELECT id INTO v_org_id FROM organization LIMIT 1;
    
    IF v_org_id IS NOT NULL THEN
        INSERT INTO app_user (id, org_id, name, phone, role, is_active)
        VALUES (
            gen_random_uuid(),
            v_org_id,
            'Super Admin',
            'admin_secret',
            'admin',
            true
        )
        ON CONFLICT (org_id, phone) DO NOTHING;
    END IF;
END $$;

COMMIT;
