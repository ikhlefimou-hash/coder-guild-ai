-- Table for group images
CREATE TABLE public.group_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  uploader_id UUID NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_images_group ON public.group_images(group_id, created_at DESC);

ALTER TABLE public.group_images ENABLE ROW LEVEL SECURITY;

-- View: members of group OR public group OR admin
CREATE POLICY "Members view group images"
ON public.group_images FOR SELECT
TO authenticated
USING (
  public.is_group_member(group_id, auth.uid())
  OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.visibility = 'public')
  OR public.has_role(auth.uid(), 'admin')
);

-- Insert: only members can upload
CREATE POLICY "Members upload images"
ON public.group_images FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = uploader_id
  AND public.is_group_member(group_id, auth.uid())
);

-- Delete: uploader or group admin or platform admin
CREATE POLICY "Uploader or group admin deletes image"
ON public.group_images FOR DELETE
TO authenticated
USING (
  auth.uid() = uploader_id
  OR public.is_group_admin(group_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_images;
ALTER TABLE public.group_images REPLICA IDENTITY FULL;

-- Storage bucket (public so we can read via public URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-images', 'group-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone authenticated can read (bucket also public for getPublicUrl)
CREATE POLICY "Anyone can view group images storage"
ON storage.objects FOR SELECT
USING (bucket_id = 'group-images');

-- Upload: authenticated user, file path must start with their user id (groupId/userId/...)
CREATE POLICY "Auth users upload to group-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'group-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Delete own files
CREATE POLICY "Users delete own group-images files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-images'
  AND auth.uid()::text = (storage.foldername(name))[2]
);