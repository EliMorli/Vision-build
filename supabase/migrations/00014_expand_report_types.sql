-- Migration: Expand report target types
-- 
-- Users can now report:
-- - user: a user profile
-- - design: a public design/project
-- - vi_reply: a Vi assistant reply message
-- (removed: message, contractor - not in MVP)

-- Drop the old constraint
alter table public.reports
drop constraint if exists reports_target_type_check;

-- Add new constraint with updated types
alter table public.reports
add constraint reports_target_type_check 
check (target_type in ('user', 'design', 'vi_reply'));

-- Add comment for clarity
comment on column public.reports.target_type is 
'Type of content being reported: user (profile), design (public project), vi_reply (assistant message)';
