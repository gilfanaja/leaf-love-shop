
-- Threads
CREATE TABLE public.chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT,
  product_id UUID,
  order_id UUID,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_for_user INT NOT NULL DEFAULT 0,
  unread_for_admin INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own threads" ON public.chat_threads
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users insert own threads" ON public.chat_threads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own threads" ON public.chat_threads
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins view all threads" ON public.chat_threads
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins update all threads" ON public.chat_threads
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER chat_threads_touch BEFORE UPDATE ON public.chat_threads
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Messages
CREATE TYPE chat_sender AS ENUM ('customer', 'admin');

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  sender chat_sender NOT NULL,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_thread_idx ON public.chat_messages(thread_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own thread messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "users insert own thread messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = 'customer' AND sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "admins view all messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins insert messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender = 'admin' AND sender_id = auth.uid() AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Update thread metadata on new message
CREATE OR REPLACE FUNCTION public.handle_new_chat_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_threads
  SET last_message_at = NEW.created_at,
      unread_for_user = CASE WHEN NEW.sender = 'admin' THEN unread_for_user + 1 ELSE unread_for_user END,
      unread_for_admin = CASE WHEN NEW.sender = 'customer' THEN unread_for_admin + 1 ELSE unread_for_admin END
  WHERE id = NEW.thread_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_chat_message_insert AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_chat_message();

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
