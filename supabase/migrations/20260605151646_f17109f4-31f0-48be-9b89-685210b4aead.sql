-- Tighten chat-files storage: only the uploader can read directly via storage.
-- Recipients access files via signed URLs embedded in RLS-protected direct_messages.
DROP POLICY IF EXISTS chat_files_read_authenticated ON storage.objects;

CREATE POLICY chat_files_read_own ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = (auth.uid())::text);