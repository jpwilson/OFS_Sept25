"""
Migration script to add status column to follows table

This script adds a status column to the follows table to support follow requests.
Existing follows are marked as 'approved' to maintain backward compatibility.
"""

import sqlite3
import sys
from pathlib import Path

def run_migration(db_path='ofs.db'):
    """Add status column to follows table"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if status column already exists
        cursor.execute("PRAGMA table_info(follows)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'status' in columns:
            print("✓ Status column already exists in follows table")
            conn.close()
            return True

        print("Adding status column to follows table...")

        # Add status column with default value 'approved' for existing rows
        cursor.execute("""
            ALTER TABLE follows
            ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
        """)

        conn.commit()

        # Verify the column was added
        cursor.execute("PRAGMA table_info(follows)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'status' in columns:
            print("✓ Successfully added status column to follows table")
            print("✓ All existing follows have been marked as 'approved'")

            # Count existing follows
            cursor.execute("SELECT COUNT(*) FROM follows")
            count = cursor.fetchone()[0]
            print(f"✓ Updated {count} existing follow relationships")

            conn.close()
            return True
        else:
            print("✗ Failed to add status column")
            conn.close()
            return False

    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False

if __name__ == "__main__":
    # Get database path from command line or use default
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'ofs.db'

    print(f"Running migration on database: {db_path}")
    print("-" * 50)

    success = run_migration(db_path)

    print("-" * 50)
    if success:
        print("Migration completed successfully!")
        sys.exit(0)
    else:
        print("Migration failed!")
        sys.exit(1)
