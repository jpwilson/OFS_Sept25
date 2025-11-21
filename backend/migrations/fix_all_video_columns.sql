-- Comprehensive fix: Ensure all video columns exist with proper defaults
-- Run this in Supabase SQL Editor to fix permanent delete issues

-- 1. Add media_type column (image or video)
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'image';

-- 2. Add video-specific columns
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS video_thumbnail_url TEXT;

-- 3. Add processing status column
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'ready';

-- 4. Add file size tracking columns
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS original_size INTEGER;

ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS compressed_size INTEGER;

-- 5. Update ALL existing rows to have proper defaults
UPDATE event_images
SET media_type = 'image'
WHERE media_type IS NULL OR media_type = '';

UPDATE event_images
SET processing_status = 'ready'
WHERE processing_status IS NULL OR processing_status = '';

-- 6. Add constraints (only if not exists)
DO $$
BEGIN
    -- Add media_type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_media_type'
    ) THEN
        ALTER TABLE event_images
        ADD CONSTRAINT check_media_type CHECK (media_type IN ('image', 'video'));
    END IF;

    -- Ensure media_type is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_images'
        AND column_name = 'media_type'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE event_images
        ALTER COLUMN media_type SET NOT NULL;
    END IF;

    -- Ensure processing_status is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'event_images'
        AND column_name = 'processing_status'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE event_images
        ALTER COLUMN processing_status SET NOT NULL;
    END IF;
END $$;

-- 7. Add indexes for faster queries (only if not exists)
CREATE INDEX IF NOT EXISTS idx_event_images_media_type ON event_images(media_type);
CREATE INDEX IF NOT EXISTS idx_event_images_event_media ON event_images(event_id, media_type);
CREATE INDEX IF NOT EXISTS idx_event_images_processing_status ON event_images(processing_status) WHERE media_type = 'video';

-- 8. Verify the changes
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'event_images'
AND column_name IN ('media_type', 'duration_seconds', 'video_thumbnail_url', 'processing_status', 'original_size', 'compressed_size')
ORDER BY ordinal_position;

-- 9. Check for any NULL values that shouldn't be there
SELECT
    COUNT(*) as total_rows,
    COUNT(media_type) as media_type_set,
    COUNT(*) - COUNT(media_type) as media_type_null,
    COUNT(processing_status) as processing_status_set,
    COUNT(*) - COUNT(processing_status) as processing_status_null
FROM event_images;
