-- Phase 1: Add video support to event_images table
-- Run this in Supabase SQL Editor

-- Add media_type column (image or video)
ALTER TABLE event_images
ADD COLUMN media_type VARCHAR(10) DEFAULT 'image';

-- Add constraint to ensure only valid media types
ALTER TABLE event_images
ADD CONSTRAINT check_media_type CHECK (media_type IN ('image', 'video'));

-- Add video-specific columns
ALTER TABLE event_images
ADD COLUMN duration_seconds INTEGER;

ALTER TABLE event_images
ADD COLUMN video_thumbnail_url TEXT;

-- Update existing rows to have media_type = 'image'
UPDATE event_images SET media_type = 'image' WHERE media_type IS NULL;

-- Add index for faster queries
CREATE INDEX idx_event_images_media_type ON event_images(media_type);
CREATE INDEX idx_event_images_event_media ON event_images(event_id, media_type);

-- Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'event_images'
ORDER BY ordinal_position;
