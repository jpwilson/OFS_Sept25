-- Add video processing columns to event_images table
-- This supports tracking video compression status and file sizes

-- Add processing status column
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) DEFAULT 'ready';

-- Add file size tracking columns
ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS original_size INTEGER;

ALTER TABLE event_images
ADD COLUMN IF NOT EXISTS compressed_size INTEGER;

-- Add index for querying videos that need processing
CREATE INDEX IF NOT EXISTS idx_event_images_processing_status
ON event_images(processing_status)
WHERE media_type = 'video';

-- Add comments for documentation
COMMENT ON COLUMN event_images.processing_status IS 'Video processing status: uploading, processing, or ready';
COMMENT ON COLUMN event_images.original_size IS 'Original file size in bytes before compression';
COMMENT ON COLUMN event_images.compressed_size IS 'Compressed file size in bytes after processing';
