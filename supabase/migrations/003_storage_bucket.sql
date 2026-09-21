-- 003_storage_bucket.sql
-- Create public read bucket for category banner images

INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to category images
CREATE POLICY "Public category images read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

-- Note: Uploads are performed via the backend using the service_role key,
-- so no public insert/update/delete policy is required.
