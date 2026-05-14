ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS allow_all_post boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.can_post_in_group(_group_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.group_id = _group_id
      AND gm.user_id = _user_id
      AND (gm.role IN ('admin','moderator') OR g.allow_all_post = true)
  );
$function$;