-- Remove authenticated user write policies on public-designs bucket
-- Only service role can upload/delete; public can still SELECT

-- Drop the INSERT policy that allowed authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload public designs" ON storage.objects;

-- Drop any UPDATE/DELETE policies on public-designs for authenticated users
DROP POLICY IF EXISTS "Authenticated users can update public designs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete public designs" ON storage.objects;

-- Keep the public SELECT policy (if it exists)
-- Public can still view objects in public-designs bucket

-- PRIVACY CONSTRAINT:
-- Only service role can write to public-designs (bypasses RLS by default).
-- The set-project-visibility edge function (using admin client) is the ONLY
-- route that should copy files here, and it MUST copy ONLY generated design
-- images (design_image, generated_image_urls), NEVER main_image (original
-- room photos showing the inside of someone's home).
-- This constraint prevents accidental exposure of private room photos.
