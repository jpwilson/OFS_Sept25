"""
Migration: Make invited_email nullable in invited_viewers table

This allows creating invite links without requiring an email address upfront.
Users can share links via text/WhatsApp without specifying the recipient's email.
"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine
from sqlalchemy import text

def run_migration():
    """Make invited_email column nullable"""
    with engine.connect() as conn:
        # Check if we're on PostgreSQL or SQLite
        dialect = engine.dialect.name

        if dialect == 'postgresql':
            # PostgreSQL: ALTER COLUMN to drop NOT NULL
            conn.execute(text("""
                ALTER TABLE invited_viewers
                ALTER COLUMN invited_email DROP NOT NULL;
            """))
            print("✅ PostgreSQL: invited_email is now nullable")
        else:
            # SQLite doesn't support ALTER COLUMN directly
            # We need to recreate the table (but for SQLite in dev, we can just note this)
            print("⚠️ SQLite: Column constraints can't be altered directly.")
            print("   For production (PostgreSQL), run the migration there.")
            print("   For local dev, you may need to recreate the database or manually edit.")

            # For SQLite, let's try a workaround - check if column already allows NULL
            result = conn.execute(text("PRAGMA table_info(invited_viewers);"))
            columns = result.fetchall()
            for col in columns:
                if col[1] == 'invited_email':
                    if col[3] == 0:  # notnull = 0 means nullable
                        print("   Column already allows NULL values.")
                    else:
                        print("   Column is NOT NULL. Recreate table if needed.")
            return

        conn.commit()
        print("✅ Migration complete!")

if __name__ == "__main__":
    run_migration()
