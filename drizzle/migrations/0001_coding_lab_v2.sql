-- Challenge details
ALTER TABLE public.coding_challenges
  ADD COLUMN is_active boolean NOT NULL DEFAULT false,
  ADD COLUMN level int NOT NULL DEFAULT 1,
  ADD COLUMN topic text NOT NULL DEFAULT 'basics',
  ADD COLUMN difficulty text NOT NULL DEFAULT 'easy',
  ADD COLUMN sort int NOT NULL DEFAULT 0,
  ADD COLUMN fn_name text,
  ADD COLUMN params text NOT NULL DEFAULT '',
  ADD COLUMN languages text[] NOT NULL DEFAULT ARRAY['python','javascript'],
  ADD COLUMN title jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN description jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.coding_challenges ADD CONSTRAINT coding_challenges_difficulty_chk CHECK (difficulty IN ('easy','medium','hard'));
CREATE INDEX coding_challenges_level_idx ON public.coding_challenges(level, sort) WHERE is_active;

-- Levels & lessons
CREATE TABLE public.lab_levels (
  level int PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title jsonb NOT NULL,
  lesson jsonb NOT NULL,
  example jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlock_required int NOT NULL DEFAULT 2 CHECK (unlock_required >= 0)
);
GRANT SELECT ON public.lab_levels TO authenticated;
GRANT ALL ON public.lab_levels TO service_role;
ALTER TABLE public.lab_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read levels" ON public.lab_levels FOR SELECT TO authenticated USING (true);

-- Tests (hidden expected values never exposed directly)
CREATE TABLE public.challenge_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id text NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  idx int NOT NULL CHECK (idx >= 0),
  args jsonb NOT NULL,
  expected jsonb NOT NULL,
  is_hidden boolean NOT NULL DEFAULT false,
  UNIQUE (challenge_id, idx)
);
GRANT ALL ON public.challenge_tests TO service_role;
ALTER TABLE public.challenge_tests ENABLE ROW LEVEL SECURITY;

-- Hints (revealed only via function)
CREATE TABLE public.challenge_hints (
  challenge_id text NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  idx int NOT NULL CHECK (idx BETWEEN 1 AND 3),
  body jsonb NOT NULL,
  PRIMARY KEY (challenge_id, idx)
);
GRANT ALL ON public.challenge_hints TO service_role;
ALTER TABLE public.challenge_hints ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.challenge_hint_usage (
  user_id uuid NOT NULL,
  challenge_id text NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  hints_used int NOT NULL DEFAULT 0 CHECK (hints_used BETWEEN 0 AND 3),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);
GRANT SELECT ON public.challenge_hint_usage TO authenticated;
GRANT ALL ON public.challenge_hint_usage TO service_role;
ALTER TABLE public.challenge_hint_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own hint usage" ON public.challenge_hint_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Attempts
CREATE TABLE public.challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_id text NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('python','javascript')),
  code text NOT NULL,
  passed boolean NOT NULL,
  passed_count int NOT NULL,
  total_count int NOT NULL,
  hints_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX challenge_attempts_user_idx ON public.challenge_attempts(user_id, created_at DESC);
GRANT SELECT ON public.challenge_attempts TO authenticated;
GRANT ALL ON public.challenge_attempts TO service_role;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.challenge_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Completions per language
ALTER TABLE public.challenge_completions
  ADD COLUMN language text NOT NULL DEFAULT 'javascript',
  ADD COLUMN hints_used int NOT NULL DEFAULT 0;
ALTER TABLE public.challenge_completions ADD CONSTRAINT challenge_completions_language_chk CHECK (language IN ('python','javascript'));
ALTER TABLE public.challenge_completions DROP CONSTRAINT challenge_completions_user_id_challenge_id_key;
ALTER TABLE public.challenge_completions ADD CONSTRAINT challenge_completions_user_challenge_lang_key UNIQUE (user_id, challenge_id, language);
CREATE INDEX challenge_completions_created_idx ON public.challenge_completions(created_at);

-- The old unverified award function must no longer be callable
REVOKE EXECUTE ON FUNCTION public.complete_challenge(text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.lab_skill_level(_xp bigint)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT floor(sqrt(GREATEST(_xp,0) / 20.0))::int + 1
$$;

CREATE OR REPLACE FUNCTION public.lab_level_unlocked(_user uuid, _level int)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _level <= 1 OR (
    SELECT COUNT(DISTINCT c.challenge_id) FROM challenge_completions c
    JOIN coding_challenges ch ON ch.id = c.challenge_id
    WHERE c.user_id = _user AND ch.is_active AND ch.level = _level - 1
  ) >= COALESCE((SELECT unlock_required FROM lab_levels WHERE level = _level), 0)
$$;

CREATE OR REPLACE FUNCTION public.get_challenge_tests(_challenge_id text)
RETURNS TABLE(idx int, args jsonb, expected jsonb, is_hidden boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.idx, t.args, CASE WHEN t.is_hidden THEN NULL ELSE t.expected END, t.is_hidden
  FROM challenge_tests t JOIN coding_challenges ch ON ch.id = t.challenge_id AND ch.is_active
  WHERE t.challenge_id = _challenge_id AND auth.uid() IS NOT NULL
  ORDER BY t.idx
$$;

CREATE OR REPLACE FUNCTION public.get_hints(_challenge_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (SELECT COALESCE((SELECT hints_used FROM challenge_hint_usage WHERE user_id = auth.uid() AND challenge_id = _challenge_id), 0) AS n)
  SELECT jsonb_build_object('used', u.n,
    'hints', COALESCE((SELECT jsonb_agg(h.body ORDER BY h.idx) FROM challenge_hints h WHERE h.challenge_id = _challenge_id AND h.idx <= u.n), '[]'::jsonb))
  FROM u WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.reveal_hint(_challenge_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM coding_challenges WHERE id = _challenge_id AND is_active) THEN RAISE EXCEPTION 'unknown challenge'; END IF;
  INSERT INTO challenge_hint_usage(user_id, challenge_id, hints_used) VALUES (auth.uid(), _challenge_id, 1)
  ON CONFLICT (user_id, challenge_id) DO UPDATE SET hints_used = LEAST(3, challenge_hint_usage.hints_used + 1), updated_at = now();
  RETURN public.get_hints(_challenge_id);
END $$;

CREATE OR REPLACE FUNCTION public.submit_solution(_challenge_id text, _language text, _code text, _outputs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid(); ch record; total int; ok int; hidden_failed int; hints int := 0;
  passed boolean; first boolean := false; award int := 0; old_xp bigint; new_xp bigint; recent int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _language NOT IN ('python','javascript') THEN RAISE EXCEPTION 'unsupported language'; END IF;
  IF _code IS NULL OR length(_code) > 20000 THEN RAISE EXCEPTION 'code too long'; END IF;
  IF jsonb_typeof(_outputs) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid outputs'; END IF;
  SELECT * INTO ch FROM coding_challenges WHERE id = _challenge_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown challenge'; END IF;
  IF NOT public.lab_level_unlocked(uid, ch.level) THEN RAISE EXCEPTION 'level locked'; END IF;
  SELECT count(*) INTO recent FROM challenge_attempts WHERE user_id = uid AND created_at > now() - interval '1 minute';
  IF recent >= 20 THEN RAISE EXCEPTION 'too many attempts, wait a minute'; END IF;

  SELECT count(*), count(*) FILTER (WHERE (_outputs -> t.idx) = t.expected),
         count(*) FILTER (WHERE t.is_hidden AND (_outputs -> t.idx) IS DISTINCT FROM t.expected)
    INTO total, ok, hidden_failed
  FROM challenge_tests t WHERE t.challenge_id = _challenge_id;

  SELECT COALESCE(hints_used, 0) INTO hints FROM challenge_hint_usage WHERE user_id = uid AND challenge_id = _challenge_id;
  hints := COALESCE(hints, 0);
  passed := total > 0 AND ok = total;

  INSERT INTO challenge_attempts(user_id, challenge_id, language, code, passed, passed_count, total_count, hints_used)
  VALUES (uid, _challenge_id, _language, _code, passed, ok, total, hints);

  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  SELECT COALESCE(SUM(c.xp), 0) INTO old_xp FROM challenge_completions c JOIN coding_challenges x ON x.id = c.challenge_id AND x.is_active WHERE c.user_id = uid;
  new_xp := old_xp;

  IF passed THEN
    award := GREATEST(1, round(ch.xp * CASE hints WHEN 0 THEN 1.0 WHEN 1 THEN 0.85 WHEN 2 THEN 0.7 ELSE 0.5 END))::int;
    INSERT INTO challenge_completions(user_id, challenge_id, language, xp, hints_used)
    VALUES (uid, _challenge_id, _language, award, hints)
    ON CONFLICT (user_id, challenge_id, language) DO NOTHING;
    IF FOUND THEN
      first := true; new_xp := old_xp + award;
      IF public.lab_skill_level(new_xp) > public.lab_skill_level(old_xp) THEN
        INSERT INTO notifications(user_id, type, title, body, link)
        VALUES (uid, 'lab_level', 'Coding Lab · Level ' || public.lab_skill_level(new_xp), new_xp || ' XP', '/dashboard/lab');
      END IF;
    ELSE
      award := 0;
    END IF;
  END IF;

  RETURN jsonb_build_object('passed', passed, 'passed_count', ok, 'total', total, 'hidden_failed', hidden_failed,
    'xp_awarded', award, 'first_time', first, 'total_xp', new_xp, 'hints_used', hints,
    'level', public.lab_skill_level(new_xp));
END $$;

CREATE OR REPLACE FUNCTION public.get_lab_stats(_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH c AS (
    SELECT c.* FROM challenge_completions c JOIN coding_challenges ch ON ch.id = c.challenge_id AND ch.is_active
    WHERE c.user_id = _user_id
  ), totals AS (
    SELECT c.user_id, SUM(c.xp) xp, COUNT(*) solved, MAX(c.created_at) last_at
    FROM challenge_completions c JOIN coding_challenges ch ON ch.id = c.challenge_id AND ch.is_active
    JOIN profiles p ON p.id = c.user_id AND NOT p.is_suspended
    GROUP BY c.user_id
  ), ranked AS (
    SELECT user_id, row_number() OVER (ORDER BY xp DESC, solved DESC, last_at ASC, user_id) rnk FROM totals
  ), a AS (
    SELECT COUNT(*) total, COUNT(*) FILTER (WHERE passed) ok FROM challenge_attempts WHERE user_id = _user_id
  )
  SELECT jsonb_build_object(
    'xp', COALESCE((SELECT SUM(xp) FROM c), 0),
    'level', public.lab_skill_level(COALESCE((SELECT SUM(xp) FROM c), 0)),
    'solved', (SELECT COUNT(*) FROM c),
    'py_solved', (SELECT COUNT(*) FROM c WHERE language = 'python'),
    'js_solved', (SELECT COUNT(*) FROM c WHERE language = 'javascript'),
    'py_xp', COALESCE((SELECT SUM(xp) FROM c WHERE language = 'python'), 0),
    'js_xp', COALESCE((SELECT SUM(xp) FROM c WHERE language = 'javascript'), 0),
    'total_challenges', (SELECT COUNT(*) FROM coding_challenges WHERE is_active),
    'attempts', (SELECT total FROM a),
    'success_rate', (SELECT CASE WHEN total = 0 THEN 0 ELSE round(ok * 100.0 / total) END FROM a),
    'rank', (SELECT rnk FROM ranked WHERE user_id = _user_id),
    'last_challenge_id', CASE WHEN _user_id = auth.uid() THEN
       (SELECT challenge_id FROM challenge_attempts WHERE user_id = _user_id ORDER BY created_at DESC LIMIT 1) END
  ) WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.get_lab_leaderboard(_scope text DEFAULT 'all', _language text DEFAULT NULL, _search text DEFAULT NULL, _limit int DEFAULT 50)
RETURNS TABLE(rnk bigint, user_id uuid, username text, full_name text, avatar_url text, is_verified boolean, xp bigint, solved bigint, success_rate int, skill_level int, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH comp AS (
    SELECT c.user_id, SUM(c.xp)::bigint xp, COUNT(*)::bigint solved, MAX(c.created_at) last_at
    FROM challenge_completions c JOIN coding_challenges ch ON ch.id = c.challenge_id AND ch.is_active
    WHERE (_language IS NULL OR c.language = _language)
      AND (_scope <> 'weekly' OR c.created_at >= date_trunc('week', now()))
    GROUP BY c.user_id
  ), att AS (
    SELECT a.user_id, COUNT(*) total, COUNT(*) FILTER (WHERE a.passed) ok FROM challenge_attempts a
    WHERE (_language IS NULL OR a.language = _language)
      AND (_scope <> 'weekly' OR a.created_at >= date_trunc('week', now()))
    GROUP BY a.user_id
  ), alltime AS (
    SELECT c.user_id, SUM(c.xp)::bigint xp FROM challenge_completions c
    JOIN coding_challenges ch ON ch.id = c.challenge_id AND ch.is_active GROUP BY c.user_id
  ), ranked AS (
    SELECT row_number() OVER (ORDER BY comp.xp DESC, comp.solved DESC,
             COALESCE(att.ok::numeric / NULLIF(att.total, 0), 0) DESC, comp.last_at ASC, comp.user_id) AS rnk,
           comp.user_id, p.username, p.full_name, p.avatar_url, p.is_verified, comp.xp, comp.solved,
           COALESCE(round(att.ok * 100.0 / NULLIF(att.total, 0)), 0)::int AS success_rate,
           public.lab_skill_level(COALESCE(alltime.xp, 0)) AS skill_level,
           comp.user_id = auth.uid() AS is_me
    FROM comp JOIN profiles p ON p.id = comp.user_id AND NOT p.is_suspended
    LEFT JOIN att ON att.user_id = comp.user_id
    LEFT JOIN alltime ON alltime.user_id = comp.user_id
  )
  SELECT * FROM (
    (SELECT * FROM ranked
      WHERE _search IS NULL OR _search = '' OR position(lower(_search) in lower(username)) > 0
         OR position(lower(_search) in lower(COALESCE(full_name, ''))) > 0
      ORDER BY rnk LIMIT LEAST(GREATEST(_limit, 1), 100))
    UNION
    (SELECT * FROM ranked WHERE is_me)
  ) r WHERE auth.uid() IS NOT NULL ORDER BY rnk
$$;

REVOKE EXECUTE ON FUNCTION public.lab_level_unlocked(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_challenge_tests(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_hints(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reveal_hint(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_solution(text, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lab_stats(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lab_leaderboard(text, text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lab_level_unlocked(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_challenge_tests(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hints(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_hint(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_solution(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lab_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lab_leaderboard(text, text, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lab_skill_level(bigint) TO authenticated;