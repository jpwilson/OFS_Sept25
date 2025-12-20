-- People Tagging System Migration
-- Run this in Supabase SQL Editor
-- Date: December 20, 2025

-- ============================================
-- Table: tag_profiles
-- For non-users (pets, kids, relatives, etc.)
-- ============================================
CREATE TABLE tag_profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    photo_url TEXT,

    -- Creator and relationship (for deduplication)
    created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_to_creator VARCHAR(100),  -- 'daughter', 'son', 'pet', 'grandmother'

    -- Merge tracking (when non-user joins the platform)
    merged_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_merged BOOLEAN DEFAULT FALSE,

    -- Future family tree support
    birth_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tag_profiles
CREATE INDEX idx_tag_profiles_name ON tag_profiles(LOWER(name));
CREATE INDEX idx_tag_profiles_created_by ON tag_profiles(created_by_id);
CREATE INDEX idx_tag_profiles_merged ON tag_profiles(merged_user_id);

-- ============================================
-- Table: event_tags
-- Links events to users OR tag profiles
-- ============================================
CREATE TABLE event_tags (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,

    -- Either user OR profile (not both) - enforced by constraint
    tagged_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tag_profile_id INTEGER REFERENCES tag_profiles(id) ON DELETE CASCADE,

    tagged_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Status: 'pending', 'accepted', 'rejected'
    -- Tag profiles are always 'accepted' (no approval needed)
    status VARCHAR(50) DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure exactly one of tagged_user_id or tag_profile_id is set
    CONSTRAINT check_one_tagged CHECK (
        (tagged_user_id IS NOT NULL AND tag_profile_id IS NULL) OR
        (tagged_user_id IS NULL AND tag_profile_id IS NOT NULL)
    ),

    -- Prevent duplicate tags for same user/profile on same event
    UNIQUE(event_id, tagged_user_id),
    UNIQUE(event_id, tag_profile_id)
);

-- Indexes for event_tags
CREATE INDEX idx_event_tags_event ON event_tags(event_id);
CREATE INDEX idx_event_tags_user ON event_tags(tagged_user_id);
CREATE INDEX idx_event_tags_profile ON event_tags(tag_profile_id);
CREATE INDEX idx_event_tags_status ON event_tags(status);
CREATE INDEX idx_event_tags_tagged_by ON event_tags(tagged_by_id);

-- ============================================
-- User table addition: notification preference
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_tag_request BOOLEAN DEFAULT TRUE;

-- ============================================
-- Trigger for updated_at on tag_profiles
-- ============================================
CREATE TRIGGER update_tag_profiles_updated_at BEFORE UPDATE ON tag_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Success message
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Tagging system tables created successfully! 🏷️';
    RAISE NOTICE 'Tables: tag_profiles, event_tags';
    RAISE NOTICE 'Added: notify_tag_request column to users';
END $$;
