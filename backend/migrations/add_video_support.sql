-- Phase 1: Add video support to event_images table
-- Run this in Supabase SQL Editor BEFORE deploying backend code

-- Add media_type column (image or video)
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image';

-- Add video-specific columns
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- Update existing rows to have media_type = 'image'
UPDATE event_images SET media_type = 'image' WHERE media_type IS NULL;

-- Add constraint to ensure only valid media types (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_media_type'
    ) THEN
        ALTER TABLE event_images
        ADD CONSTRAINT check_media_type CHECK (media_type IN ('image', 'video'));
    END IF;
END $$;

-- Add indexes for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_event_images_media_type ON event_images(media_type);
CREATE INDEX IF NOT EXISTS idx_event_images_event_media ON event_images(event_id, media_type);

-- Verify the changes
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_images'
ORDER BY ordinal_position;
