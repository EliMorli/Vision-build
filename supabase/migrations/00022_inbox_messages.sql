-- Inbox messages for pro communications (placeholder for future pros feature)

CREATE TABLE public.inbox_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.inbox_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their messages as read"
  ON public.inbox_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_inbox_messages_user ON public.inbox_messages(user_id, created_at DESC);
CREATE INDEX idx_inbox_messages_unread ON public.inbox_messages(user_id) WHERE NOT is_read;

-- Grant permissions AFTER table exists
-- authenticated can only update is_read column
REVOKE UPDATE ON public.inbox_messages FROM authenticated;
GRANT UPDATE (is_read) ON public.inbox_messages TO authenticated;
GRANT SELECT ON public.inbox_messages TO authenticated;
