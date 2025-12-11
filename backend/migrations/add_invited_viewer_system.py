"""
Migration: Add Invited Viewer System

Creates:
- invited_viewers table
- viewer_notification_logs table
- New columns on users table (is_invited_viewer, invited_viewer_mode, notify_invitee_new_event)
- New columns on follows table (invited_viewer_follow, invitation_id)

Run this migration after deploying the backend code.
"""
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text
from app.core.config import settings


def run_migration():
    """Add invited viewer system tables and columns"""
    engine = create_engine(settings.DATABASE_URL)

    with engine.connect() as conn:
        # ===== 1. Create invited_viewers table =====
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'invited_viewers'
            )
        """))
        if result.fetchone()[0]:
            print("invited_viewers table already exists. Skipping table creation.")
        else:
            conn.execute(text("""
                CREATE TABLE invited_viewers (
                    id SERIAL PRIMARY KEY,
                    inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    invited_email VARCHAR NOT NULL,
                    invited_name VARCHAR,
                    invite_token VARCHAR(64) UNIQUE NOT NULL,
                    status VARCHAR DEFAULT 'pending',
                    resulting_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    signed_up_at TIMESTAMP
                )
            """))
            conn.execute(text("CREATE INDEX idx_invited_viewers_email ON invited_viewers(invited_email)"))
            conn.execute(text("CREATE INDEX idx_invited_viewers_token ON invited_viewers(invite_token)"))
            conn.execute(text("CREATE INDEX idx_invited_viewers_inviter ON invited_viewers(inviter_id)"))
            print("Created invited_viewers table with indexes")

        # ===== 2. Create viewer_notification_logs table =====
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'viewer_notification_logs'
            )
        """))
        if result.fetchone()[0]:
            print("viewer_notification_logs table already exists. Skipping table creation.")
        else:
            conn.execute(text("""
                CREATE TABLE viewer_notification_logs (
                    id SERIAL PRIMARY KEY,
                    viewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    event_author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    sent_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.execute(text("""
                CREATE INDEX idx_vnl_viewer_author_time
                ON viewer_notification_logs(viewer_id, event_author_id, sent_at)
            """))
            print("Created viewer_notification_logs table with index")

        # ===== 3. Add columns to users table =====
        user_columns = [
            ("is_invited_viewer", "BOOLEAN DEFAULT FALSE"),
            ("invited_viewer_mode", "BOOLEAN DEFAULT FALSE"),
            ("notify_invitee_new_event", "BOOLEAN DEFAULT TRUE"),
        ]

        for col_name, col_def in user_columns:
            result = conn.execute(text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = '{col_name}'
            """))
            if result.fetchone():
                print(f"Column users.{col_name} already exists. Skipping.")
            else:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}"))
                print(f"Added column users.{col_name}")

        # ===== 4. Add columns to follows table =====
        follow_columns = [
            ("invited_viewer_follow", "BOOLEAN DEFAULT FALSE"),
            ("invitation_id", "INTEGER REFERENCES invited_viewers(id) ON DELETE SET NULL"),
        ]

        for col_name, col_def in follow_columns:
            result = conn.execute(text(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'follows' AND column_name = '{col_name}'
            """))
            if result.fetchone():
                print(f"Column follows.{col_name} already exists. Skipping.")
            else:
                conn.execute(text(f"ALTER TABLE follows ADD COLUMN {col_name} {col_def}"))
                print(f"Added column follows.{col_name}")

        conn.commit()

    print("\n✅ Migration completed: Invited Viewer System is ready!")
    print("Next steps:")
    print("  1. Deploy the updated backend code")
    print("  2. Test creating invitations via /api/v1/invitations")


if __name__ == "__main__":
    run_migration()
