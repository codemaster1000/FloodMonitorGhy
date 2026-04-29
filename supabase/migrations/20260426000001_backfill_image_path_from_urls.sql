-- Backfill image_path for existing reports from their image_url
-- This ensures old reports will be cleaned up by the cron job

UPDATE public.flood_reports
SET image_path = SUBSTRING(
  image_url,
  POSITION('flood-images/' IN image_url) + LENGTH('flood-images/')
)
WHERE image_path IS NULL
  AND image_url IS NOT NULL
  AND image_url LIKE '%flood-images/%';

-- Log the number of rows updated
SELECT COUNT(*) as rows_updated
FROM public.flood_reports
WHERE image_path IS NOT NULL
  AND image_url IS NOT NULL;
