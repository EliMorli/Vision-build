-- Migration: Convert signed URLs to storage paths in projects table
-- This fixes a privacy bug where 1-year signed URLs were stored in the database
-- Now we only store storage paths and generate short-lived URLs on demand

-- Function to extract storage path from a signed URL
CREATE OR REPLACE FUNCTION extract_storage_path(url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- If it's already a path (no http), return as-is
  IF url IS NULL OR url = '' THEN
    RETURN url;
  END IF;
  
  IF NOT (url LIKE 'http://%' OR url LIKE 'https://%') THEN
    RETURN url;
  END IF;
  
  -- Extract path from signed URL pattern:
  -- https://...supabase.co/storage/v1/object/sign/room-photos/<path>?token=...
  -- or https://...supabase.co/storage/v1/object/public/room-photos/<path>
  
  -- Try to match the pattern
  RETURN substring(url FROM '/storage/v1/object/(?:sign|public)/[^/]+/(.+?)(?:\?|$)');
END;
$$;

-- Update original_image_url column
UPDATE projects
SET original_image_url = extract_storage_path(original_image_url)
WHERE original_image_url IS NOT NULL
  AND (original_image_url LIKE '%token=%' OR original_image_url LIKE 'http%');

-- Update selected_generation_url column
UPDATE projects
SET selected_generation_url = extract_storage_path(selected_generation_url)
WHERE selected_generation_url IS NOT NULL
  AND (selected_generation_url LIKE '%token=%' OR selected_generation_url LIKE 'http%');

-- Update generated_image_urls array column
UPDATE projects
SET generated_image_urls = (
  SELECT array_agg(extract_storage_path(url))
  FROM unnest(generated_image_urls) AS url
)
WHERE generated_image_urls IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(generated_image_urls) AS url
    WHERE url LIKE '%token=%' OR url LIKE 'http%'
  );

-- Drop the helper function (no longer needed)
DROP FUNCTION IF EXISTS extract_storage_path(TEXT);

-- Add a comment documenting this change
COMMENT ON COLUMN projects.original_image_url IS 'Storage path (not URL) to original room photo in room-photos bucket';
COMMENT ON COLUMN projects.selected_generation_url IS 'Storage path (not URL) to selected design in room-photos bucket';
COMMENT ON COLUMN projects.generated_image_urls IS 'Array of storage paths (not URLs) to generated designs in room-photos bucket';
