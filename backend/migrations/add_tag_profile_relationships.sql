-- Migration: Add tag_profile_relationships table for multiple relationships per tag profile
-- This allows tag profiles (non-users) to have relationships with multiple users
-- Example: Kim Beater can be Jean-Paul's father-in-law AND Michelle's father

-- Create the new relationships table
CREATE TABLE IF NOT EXISTS tag_profile_relationships (
    id SERIAL PRIMARY KEY,
    tag_profile_id INTEGER REFERENCES tag_profiles(id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,  -- "father", "father-in-law", "pet", etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Each tag profile can only have one relationship type per user
    UNIQUE(tag_profile_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tag_profile_relationships_tag ON tag_profile_relationships(tag_profile_id);
CREATE INDEX IF NOT EXISTS idx_tag_profile_relationships_user ON tag_profile_relationships(user_id);

-- Migrate existing data from relationship_to_creator
-- This preserves existing relationships by copying them to the new table
INSERT INTO tag_profile_relationships (tag_profile_id, user_id, relationship_type)
SELECT id, created_by_id, relationship_to_creator
FROM tag_profiles
WHERE relationship_to_creator IS NOT NULL
  AND relationship_to_creator != ''
  AND NOT EXISTS (
    SELECT 1 FROM tag_profile_relationships tpr
    WHERE tpr.tag_profile_id = tag_profiles.id
    AND tpr.user_id = tag_profiles.created_by_id
  );

-- Comments
COMMENT ON TABLE tag_profile_relationships IS 'Relationships between tag profiles and users - allows one tag profile to have relationships with multiple users';
COMMENT ON COLUMN tag_profile_relationships.relationship_type IS 'The relationship type from the user perspective (e.g., father, daughter, pet)';
