-- Enums
CREATE TYPE public.group_visibility AS ENUM ('public', 'private');
CREATE TYPE public.group_member_role AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE public.join_request_status AS ENUM ('pending', 'approved', 'rejected');

-- groups
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  visibility public.group_visibility NOT NULL DEFAULT 'public',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_groups_visibility ON public.groups(visibility);
CREATE INDEX idx_groups_created_by ON public.groups(created_by);

-- group_members
CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role public.group_member_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- join requests
CREATE TABLE public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);
CREATE INDEX idx_join_requests_group ON public.group_join_requests(group_id);

-- posts
CREATE TABLE public.group_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_group_posts_group ON public.group_posts(group_id, created_at DESC);

-- updated_at triggers
CREATE TRIGGER trg_groups_updated BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_group_posts_updated BEFORE UPDATE ON public.group_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper SECURITY DEFINER functions (avoid recursive RLS on group_members)
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.get_group_role(_group_id UUID, _user_id UUID)
RETURNS public.group_member_role LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.can_post_in_group(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role IN ('admin','moderator')
  );
$$;

-- Auto-add creator as admin
CREATE OR REPLACE FUNCTION public.handle_new_group()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'admin');
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_new_group_admin AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_group();

-- When join request is approved -> add member
CREATE OR REPLACE FUNCTION public.handle_join_request_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.group_id, NEW.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_join_request_approval AFTER UPDATE ON public.group_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_join_request_approval();

-- Enable RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

-- Policies: groups
CREATE POLICY "View public groups or member's private groups" ON public.groups
  FOR SELECT TO authenticated
  USING (visibility = 'public' OR public.is_group_member(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated create group" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_suspended = true));

CREATE POLICY "Group admin updates group" ON public.groups
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_group_admin(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Group admin deletes group" ON public.groups
  FOR DELETE TO authenticated
  USING (public.is_group_admin(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Policies: group_members
CREATE POLICY "Members view group members" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.visibility = 'public')
    OR public.has_role(auth.uid(), 'admin')
  );

-- Insert: only self into PUBLIC groups (private goes through join_requests + trigger).
CREATE POLICY "Self join public groups" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'member'
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.visibility = 'public')
  );

CREATE POLICY "Admin updates member roles" ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "Self leave or admin removes" ON public.group_members
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_group_admin(group_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Policies: join_requests
CREATE POLICY "View own requests or admin views all" ON public.group_join_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "User creates own request for private group" ON public.group_join_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.visibility = 'private')
    AND NOT public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "Admin updates requests" ON public.group_join_requests
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(group_id, auth.uid()))
  WITH CHECK (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "User cancels own request or admin deletes" ON public.group_join_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_group_admin(group_id, auth.uid()));

-- Policies: posts
CREATE POLICY "Members view posts" ON public.group_posts
  FOR SELECT TO authenticated
  USING (
    public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.visibility = 'public')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admin/mod create posts" ON public.group_posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.can_post_in_group(group_id, auth.uid()));

CREATE POLICY "Author updates own post" ON public.group_posts
  FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Author or group admin deletes post" ON public.group_posts
  FOR DELETE TO authenticated
  USING (auth.uid() = author_id OR public.is_group_admin(group_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));