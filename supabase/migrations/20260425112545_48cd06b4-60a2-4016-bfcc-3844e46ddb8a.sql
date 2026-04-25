-- Add first_name and last_name to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update handle_new_user to capture first/last name from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  base_username TEXT;
  final_username TEXT;
  suffix INT := 0;
  fname TEXT;
  lname TEXT;
  full_n TEXT;
BEGIN
  fname := NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), '');
  lname := NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), '');
  full_n := NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), '');

  IF full_n IS NULL AND (fname IS NOT NULL OR lname IS NOT NULL) THEN
    full_n := TRIM(CONCAT_WS(' ', fname, lname));
  END IF;

  base_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    SPLIT_PART(NEW.email, '@', 1)
  );
  base_username := REGEXP_REPLACE(LOWER(base_username), '[^a-z0-9_]', '_', 'g');
  IF char_length(base_username) < 3 THEN
    base_username := base_username || '_user';
  END IF;
  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    suffix := suffix + 1;
    final_username := base_username || suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, full_name, first_name, last_name)
  VALUES (NEW.id, final_username, full_n, fname, lname);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();