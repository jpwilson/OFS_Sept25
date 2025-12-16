"""
Migration: Add resend tracking columns to invited_viewers table

Adds:
- resend_count: Track number of times invitation was resent (max 2)
- last_sent_at: Timestamp of last email send

Run with: python3 migrations/add_resend_tracking.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from app.core.config import settings


def run_migration():
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if columns already exist
        if "postgresql" in settings.DATABASE_URL or "postgres" in settings.DATABASE_URL:
            # PostgreSQL
            result = conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'invited_viewers' AND column_name = 'resend_count'
            """))
            if result.fetchone():
                print("Migration already applied - resend_count column exists")
                return

            # Add columns
            conn.execute(text("""
                ALTER TABLE invited_viewers
                ADD COLUMN resend_count INTEGER DEFAULT 0
            """))
            conn.execute(text("""
                ALTER TABLE invited_viewers
                ADD COLUMN last_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """))
            conn.commit()
            print("PostgreSQL migration complete - added resend_count and last_sent_at columns")
        else:
            # SQLite
            result = conn.execute(text("PRAGMA table_info(invited_viewers)"))
            columns = [row[1] for row in result.fetchall()]

            if 'resend_count' in columns:
                print("Migration already applied - resend_count column exists")
                return

            conn.execute(text("ALTER TABLE invited_viewers ADD COLUMN resend_count INTEGER DEFAULT 0"))
            conn.execute(text("ALTER TABLE invited_viewers ADD COLUMN last_sent_at TIMESTAMP"))
            conn.commit()
            print("SQLite migration complete - added resend_count and last_sent_at columns")


if __name__ == "__main__":
    run_migration()
