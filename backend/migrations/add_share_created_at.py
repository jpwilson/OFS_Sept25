"""
Migration: Add share_created_at column to events table

Run this migration after deploying the backend code.
"""
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from app.core.config import settings

def run_migration():
    """Add share_created_at column to events table"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # Check if column already exists
        result = conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'events' AND column_name = 'share_created_at'
        """))
        if result.fetchone():
            print("share_created_at column already exists. Skipping.")
            return

        # Add share_created_at column
        conn.execute(text("""
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS share_created_at TIMESTAMP
        """))

        conn.commit()

    print("Migration completed: share_created_at column added to events table")


if __name__ == "__main__":
    run_migration()
