-- ============ AI CHATS ============
CREATE TABLE public.ai_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'محادثة جديدة',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_chats_user ON public.ai_chats(user_id, updated_at DESC);
ALTER TABLE public.ai_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own chats" ON public.ai_chats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users create own chats" ON public.ai_chats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own chats" ON public.ai_chats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own chats" ON public.ai_chats FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER ai_chats_updated_at BEFORE UPDATE ON public.ai_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AI MESSAGES ============
CREATE TYPE public.ai_role AS ENUM ('user', 'assistant');

CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.ai_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.ai_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_chat ON public.ai_messages(chat_id, created_at);
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai messages" ON public.ai_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai messages" ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own ai messages" ON public.ai_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
ALTER TABLE public.ai_messages REPLICA IDENTITY FULL;

-- ============ LESSONS ============
CREATE TYPE public.lesson_type AS ENUM ('free', 'paid');

CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  cover_url TEXT,
  video_url TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  type public.lesson_type NOT NULL DEFAULT 'free',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lessons_published ON public.lessons(is_published, created_at DESC);
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published lessons viewable by authenticated" ON public.lessons FOR SELECT TO authenticated
  USING (is_published = true OR auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own lessons" ON public.lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_suspended = true));
CREATE POLICY "Author updates own lesson" ON public.lessons FOR UPDATE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Author deletes own lesson" ON public.lessons FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ IDEAS (للبيع) ============
CREATE TABLE public.ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  cover_url TEXT,
  preview_code TEXT,
  full_code TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ideas_published ON public.ideas(is_published, created_at DESC);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

-- ملاحظة: full_code مخفي على الكلاينت — نعرض preview_code فقط في القائمة
CREATE POLICY "Published ideas viewable by authenticated" ON public.ideas FOR SELECT TO authenticated
  USING (is_published = true OR auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own ideas" ON public.ideas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seller_id AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_suspended = true));
CREATE POLICY "Seller updates own idea" ON public.ideas FOR UPDATE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Seller deletes own idea" ON public.ideas FOR DELETE TO authenticated
  USING (auth.uid() = seller_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON public.ideas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();