
/*
  # Fix sync_profile_email trigger

  This trigger fires on INSERT to auth.users at the same time as handle_new_user.
  The profile row may not exist yet when it runs, causing the UPDATE to fail
  and Supabase Auth to return "Database error saving new user".

  Fix: wrap in exception handler so it never blocks signup.
  The email column gets synced correctly on UPDATE (password resets, email changes).
*/

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
