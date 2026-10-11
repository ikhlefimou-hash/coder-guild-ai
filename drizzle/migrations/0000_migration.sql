CREATE TABLE public.coding_challenges (id text PRIMARY KEY, xp int NOT NULL CHECK (xp > 0));
INSERT INTO public.coding_challenges VALUES ('sum',10),('reverse',10),('max',15),('palindrome',20),('fizzbuzz',25),('vowels',20),('factorial',25),('fibonacci',30),('unique',30),('anagram',40);
ALTER TABLE public.coding_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read challenges" ON public.coding_challenges FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.coding_challenges TO authenticated;

CREATE TABLE public.challenge_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id text NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  xp int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, challenge_id)
);
ALTER TABLE public.challenge_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own completions" ON public.challenge_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
GRANT SELECT ON public.challenge_completions TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_challenge(_challenge_id text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _xp int; _total int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT xp INTO _xp FROM coding_challenges WHERE id = _challenge_id;
  IF _xp IS NULL THEN RAISE EXCEPTION 'unknown challenge'; END IF;
  INSERT INTO challenge_completions(user_id, challenge_id, xp) VALUES (auth.uid(), _challenge_id, _xp)
  ON CONFLICT (user_id, challenge_id) DO NOTHING;
  SELECT COALESCE(SUM(xp),0) INTO _total FROM challenge_completions WHERE user_id = auth.uid();
  RETURN _total;
END $$;
REVOKE EXECUTE ON FUNCTION public.complete_challenge(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_challenge(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_leaderboard(_limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text, is_verified boolean, xp bigint, solved bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username, p.full_name, p.avatar_url, p.is_verified, SUM(c.xp)::bigint, COUNT(*)::bigint
  FROM challenge_completions c JOIN profiles p ON p.id = c.user_id
  WHERE p.is_suspended = false
  GROUP BY p.id ORDER BY 6 DESC, MAX(c.created_at) ASC LIMIT LEAST(_limit, 100)
$$;
REVOKE EXECUTE ON FUNCTION public.get_leaderboard(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;