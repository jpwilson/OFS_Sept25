"""
Migration script to add banner_url column to users table
"""
import sqlite3
import sys

def run_migration(db_path='ofs.db'):
    """Add banner_url column to users table"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Check if banner_url column already exists
        cursor.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'banner_url' in columns:
            print("✓ banner_url column already exists in users table")
            conn.close()
            return True

        # Add banner_url column
        cursor.execute("""
            ALTER TABLE users
            ADD COLUMN banner_url TEXT NULL
        """)

        conn.commit()

        # Verify
        cursor.execute("SELECT COUNT(*) FROM users")
        count = cursor.fetchone()[0]
        print(f"✓ Added banner_url column to users table ({count} users updated)")

        conn.close()
        return True

    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'ofs.db'
    success = run_migration(db_path)
    sys.exit(0 if success else 1)
