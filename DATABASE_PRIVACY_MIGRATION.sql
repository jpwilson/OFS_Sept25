-- =====================================================
-- PRIVACY SYSTEM MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add privacy_level and category to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS privacy_level TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS custom_group_id INTEGER,
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS share_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS share_view_count INTEGER DEFAULT 0;

-- Add CHECK constraint for privacy_level
ALTER TABLE events
ADD CONSTRAINT events_privacy_level_check
CHECK (privacy_level IN ('public', 'followers', 'close_family', 'custom_group', 'private'));

-- Add index for faster queries on privacy and category
CREATE INDEX IF NOT EXISTS idx_events_privacy_level ON events(privacy_level);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);
CREATE INDEX IF NOT EXISTS idx_events_share_token ON events(share_token);

-- 2. Add is_close_family flag to follows table
ALTER TABLE follows
ADD COLUMN IF NOT EXISTS is_close_family BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_follows_close_family ON follows(following_id, is_close_family);

-- 3. Create custom_groups table for user-defined groups
CREATE TABLE IF NOT EXISTS custom_groups (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id, name)
);

CREATE INDEX IF NOT EXISTS idx_custom_groups_owner ON custom_groups(owner_id);

-- 4. Create custom_group_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS custom_group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES custom_groups(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_custom_group_members_group ON custom_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_custom_group_members_user ON custom_group_members(user_id);

-- 5. Add foreign key for custom_group_id in events (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'events_custom_group_id_fkey'
    ) THEN
        ALTER TABLE events
        ADD CONSTRAINT events_custom_group_id_fkey
        FOREIGN KEY (custom_group_id)
        REFERENCES custom_groups(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Create updated_at trigger function for custom_groups
CREATE OR REPLACE FUNCTION update_custom_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for custom_groups
DROP TRIGGER IF EXISTS trigger_update_custom_groups_updated_at ON custom_groups;
CREATE TRIGGER trigger_update_custom_groups_updated_at
    BEFORE UPDATE ON custom_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_groups_updated_at();

-- =====================================================
-- VERIFICATION QUERIES (run these to verify)
-- =====================================================

-- Verify events table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events'
AND column_name IN ('privacy_level', 'category', 'custom_group_id', 'share_token', 'share_enabled', 'share_expires_at', 'share_view_count');

-- Verify follows table columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'follows'
AND column_name = 'is_close_family';

-- Verify custom_groups table
SELECT * FROM custom_groups LIMIT 1;

-- Verify custom_group_members table
SELECT * FROM custom_group_members LIMIT 1;

-- Check constraints
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname LIKE '%privacy%' OR conname LIKE '%custom_group%';
