ALTER TABLE public.group_posts REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;