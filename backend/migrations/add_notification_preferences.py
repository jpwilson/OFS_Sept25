"""
Migration: Add email notification preferences to users table

Run this migration after deploying the backend code.
"""
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def run_migration():
    """Add notification preference columns to users table"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if columns already exist
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'email_notifications_enabled'
        """))
        if result.fetchone():
            print("Notification preference columns already exist. Skipping.")
            return

        # Add notification preference columns
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT TRUE
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS notify_new_follower BOOLEAN DEFAULT TRUE
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS notify_new_comment BOOLEAN DEFAULT TRUE
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS notify_trial_reminder BOOLEAN DEFAULT TRUE
        """))
        conn.execute(text("""
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS notify_event_shared BOOLEAN DEFAULT TRUE
        """))

        conn.commit()

    print("Migration completed: notification preference columns added to users table")


if __name__ == "__main__":
    run_migration()
