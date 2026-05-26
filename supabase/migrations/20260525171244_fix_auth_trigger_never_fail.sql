
/*
  # Make handle_new_user trigger bullet-proof

  The trigger must NEVER raise an exception, otherwise Supabase Auth
  wraps it as "Database error saving new user" and the signup fails.

  Wrap the entire body in BEGIN/EXCEPTION so any error is silently
  swallowed — the profile will be created on next login via fetchProfile retry.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'phone', ''), ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'passenger')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = CASE WHEN NULLIF(EXCLUDED.full_name, '') IS NOT NULL THEN EXCLUDED.full_name ELSE profiles.full_name END,
    phone     = CASE WHEN NULLIF(EXCLUDED.phone, '') IS NOT NULL THEN EXCLUDED.phone ELSE profiles.phone END,
    role      = CASE WHEN NULLIF(EXCLUDED.role::text, '') IS NOT NULL THEN EXCLUDED.role ELSE profiles.role END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signup — profile fetch retries handle missing profiles
  RETURN NEW;
END;
$$;
