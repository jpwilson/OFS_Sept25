-- Migration: Add user_relationships table for verified family relationships
-- This enables users who mutually follow each other to establish verified relationships
-- (e.g., wife/husband, parent/child, siblings, etc.)

-- Create the user_relationships table
CREATE TABLE IF NOT EXISTS user_relationships (
    id SERIAL PRIMARY KEY,

    -- The two users in the relationship (ordered: user_a_id < user_b_id)
    user_a_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    user_b_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,

    -- What each user calls the other
    -- e.g., user_a calls user_b "wife", user_b calls user_a "husband"
    relationship_a_to_b VARCHAR(50) NOT NULL,
    relationship_b_to_a VARCHAR(50) NOT NULL,

    -- Status: pending (awaiting approval), accepted, rejected
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,

    -- Who proposed the relationship
    proposed_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    CONSTRAINT user_relationships_unique UNIQUE(user_a_id, user_b_id),
    CONSTRAINT user_relationships_ordering CHECK(user_a_id < user_b_id),
    CONSTRAINT user_relationships_status_check CHECK(status IN ('pending', 'accepted', 'rejected'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_a ON user_relationships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_b ON user_relationships(user_b_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_status ON user_relationships(status);
CREATE INDEX IF NOT EXISTS idx_user_relationships_proposed_by ON user_relationships(proposed_by_id);

-- Add notification preference for relationship requests
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_relationship_request BOOLEAN DEFAULT TRUE;

-- Comment on table
COMMENT ON TABLE user_relationships IS 'Verified relationships between users who mutually follow each other';
COMMENT ON COLUMN user_relationships.relationship_a_to_b IS 'How user_a describes user_b (e.g., wife, daughter, brother)';
COMMENT ON COLUMN user_relationships.relationship_b_to_a IS 'How user_b describes user_a (e.g., husband, father, brother)';
