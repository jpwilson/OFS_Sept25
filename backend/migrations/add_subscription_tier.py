import sqlite3

# Connect to database
conn = sqlite3.connect('ofs.db')
cursor = conn.cursor()

# Add subscription_tier column
try:
    cursor.execute('''
        ALTER TABLE users
        ADD COLUMN subscription_tier TEXT DEFAULT 'free'
    ''')
    print("✅ Added subscription_tier column to users table")
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("ℹ️  subscription_tier column already exists")
    else:
        raise e

# Update existing users to 'free' tier if NULL
cursor.execute('''
    UPDATE users
    SET subscription_tier = 'free'
    WHERE subscription_tier IS NULL
''')

conn.commit()
conn.close()

print("✅ Migration complete - all users set to 'free' tier by default")
