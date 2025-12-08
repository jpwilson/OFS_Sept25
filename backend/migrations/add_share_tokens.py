"""
Migration: Add share_tokens table for temporary share links

Run this migration after deploying the backend code.
"""
import os
import sys

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def run_migration():
    """Add share_tokens table"""
    engine = create_engine(settings.DATABASE_URL)
    inspector = inspect(engine)

    # Check if table already exists
    existing_tables = inspector.get_table_names()
    if 'share_tokens' in existing_tables:
        print("Table 'share_tokens' already exists. Skipping.")
        return

    with engine.connect() as conn:
        # Create share_tokens table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS share_tokens (
                id SERIAL PRIMARY KEY,
                token VARCHAR(64) UNIQUE NOT NULL,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                sent_to_email VARCHAR(255),
                expires_at TIMESTAMP NOT NULL,
                views INTEGER DEFAULT 0,
                last_viewed_at TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))

        # Create indexes
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON share_tokens(token)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_tokens_event_id ON share_tokens(event_id)"))
        conn.execute(text("CREATE INDEX IF NOT EXISTS idx_share_tokens_created_by_id ON share_tokens(created_by_id)"))

        conn.commit()

    print("Migration completed: share_tokens table created")


if __name__ == "__main__":
    run_migration()
