-- Add Supabase Auth integration columns to users table
-- Migration: Add auth_user_id and display_name

-- Add auth_user_id to link with Supabase auth.users
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Add display_name (separate from username/@handle)
-- username becomes the permanent @handle, display_name can be changed
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Create index for faster lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- Update existing users to have display_name = full_name (if they have one)
UPDATE users SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- Update existing users to have display_name = username (fallback)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Comment for clarity
COMMENT ON COLUMN users.auth_user_id IS 'References Supabase auth.users.id - NULL for legacy users';
COMMENT ON COLUMN users.username IS 'Permanent @handle used in URLs and @mentions - cannot be changed';
COMMENT ON COLUMN users.display_name IS 'User-friendly display name shown in UI - can be changed anytime';
