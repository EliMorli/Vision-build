-- ============================================================
-- Storage Buckets + Policies
-- ============================================================

-- Create the bucket for room photos and generated images
insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

-- Policy: authenticated users can upload to their own folder
create policy "Users can upload own images"
  on storage.objects for insert
  with check (
    bucket_id = 'room-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: anyone can read (public bucket for sharing before/after)
create policy "Public read access"
  on storage.objects for select
  using (bucket_id = 'room-photos');

-- Policy: service role can upload generated images (Edge Functions)
-- (service_role bypasses RLS by default, so no explicit policy needed)
