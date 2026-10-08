-- Chat messages for inbox (placeholder for future pros feature)

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their messages as read"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_unread ON public.chat_messages(user_id) WHERE NOT is_read;

-- Grant permissions AFTER table exists
GRANT SELECT, UPDATE ON public.chat_messages TO authenticated;
GRANT SELECT ON public.chat_messages TO anon;
