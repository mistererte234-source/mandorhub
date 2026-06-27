import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import engine
from sqlmodel import text

def run_migration():
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;"))
        conn.execute(text("ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN ('contractor','mandor','admin','bendahara'));"))
        
        # Add new columns to project
        try:
            conn.execute(text("ALTER TABLE project ADD COLUMN tukang_daily_rate numeric(15,2) DEFAULT 0.0;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE project ADD COLUMN kuli_daily_rate numeric(15,2) DEFAULT 0.0;"))
        except Exception:
            pass
            
        # Add new columns to target
        try:
            conn.execute(text("ALTER TABLE target ADD COLUMN weight numeric(5,2) DEFAULT 0.0;"))
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE target ADD COLUMN week_number integer DEFAULT 1;"))
        except Exception:
            pass
        
        conn.execute(text("""
        CREATE TABLE IF NOT EXISTS finance_log (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            org_id uuid NOT NULL REFERENCES organization(id),
            project_id uuid NOT NULL REFERENCES project(id),
            type text NOT NULL CHECK (type IN ('in','out')),
            category text NOT NULL,
            amount numeric(15,2) NOT NULL DEFAULT 0,
            description text,
            date date NOT NULL,
            recorded_by uuid NOT NULL REFERENCES app_user(id),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            deleted_at timestamptz
        );
        """))
        print("Migration successful.")

if __name__ == "__main__":
    run_migration()
