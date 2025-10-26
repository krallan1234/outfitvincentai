-- Update existing clothes image URLs from public URLs to storage paths
-- Extract the storage path from public URLs and update the image_url column

UPDATE clothes
SET image_url = regexp_replace(
  image_url,
  '^https?://[^/]+/storage/v1/object/public/clothes/',
  '',
  'g'
)
WHERE image_url LIKE '%/storage/v1/object/public/clothes/%';

-- Also handle any URLs that might have been stored with the full public URL format
-- This ensures all image URLs are now just the storage path (user_id/filename)
