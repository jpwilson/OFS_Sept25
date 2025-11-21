-- Migration: Add event_images table for proper image management with captions
-- Date: 2025-11-10

CREATE TABLE IF NOT EXISTS event_images (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    caption TEXT,
    -- GPS data extracted from EXIF
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timestamp TIMESTAMP,  -- When photo was taken (from EXIF)
    -- Ordering and metadata
    order_index INTEGER DEFAULT 0,
    alt_text VARCHAR,  -- For accessibility
    width INTEGER,  -- Image dimensions
    height INTEGER,
    file_size INTEGER,  -- In bytes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_images_event_id ON event_images(event_id);
CREATE INDEX IF NOT EXISTS idx_event_images_order ON event_images(event_id, order_index);

-- Add trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_event_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_images_updated_at
    BEFORE UPDATE ON event_images
    FOR EACH ROW
    EXECUTE FUNCTION update_event_images_updated_at();
