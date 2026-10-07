-- ============================================================
-- Storage Privacy Migration
-- Makes room-photos private and adds public-designs bucket
-- ============================================================

-- ─── Make room-photos bucket private ───────────────────────

update storage.buckets
set public = false
where id = 'room-photos';

-- Drop the old public read policy
drop policy if exists "Public read access" on storage.objects;

-- Users can read/write their own folder in room-photos
create policy "Users can read own images"
  on storage.objects for select
  using (
    bucket_id = 'room-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own images"
  on storage.objects for delete
  using (
    bucket_id = 'room-photos'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── Create public-designs bucket ──────────────────────────

insert into storage.buckets (id, name, public)
values ('public-designs', 'public-designs', true)
on conflict (id) do nothing;

-- Public read for public-designs
create policy "Public can read public designs"
  on storage.objects for select
  using (bucket_id = 'public-designs');

-- Authenticated users can upload to public-designs (managed by edge functions)
create policy "Authenticated users can upload public designs"
  on storage.objects for insert
  with check (
    bucket_id = 'public-designs'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated users can delete public designs"
  on storage.objects for delete
  using (
    bucket_id = 'public-designs'
    and auth.role() = 'authenticated'
  );
