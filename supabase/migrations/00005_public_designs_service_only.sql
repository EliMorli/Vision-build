-- Remove authenticated user write policies on public-designs bucket
-- Only service role can upload/delete; public can still SELECT

-- Drop the INSERT policy that allowed authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload public designs" ON storage.objects;

-- Drop any UPDATE/DELETE policies on public-designs for authenticated users
DROP POLICY IF EXISTS "Authenticated users can update public designs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete public designs" ON storage.objects;

-- Keep the public SELECT policy (if it exists)
-- Public can still view objects in public-designs bucket

-- Note: Service role bypasses RLS by default and can always write
-- The app will call set-project-visibility edge function (with admin client) 
-- to copy/remove files when toggling project visibility
