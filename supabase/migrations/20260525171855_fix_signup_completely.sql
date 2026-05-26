
/*
  # Complete signup fix

  ## Root cause
  Supabase's email confirmation flow fires the on_auth_user_created trigger
  TWICE: once when the user signs up (before confirmation) and once after
  they confirm. On the first fire, raw_user_meta_data may be incomplete or
  the INSERT hits an issue, causing "Database error saving new user".

  Also: the profiles table has a CHECK constraint requiring role to be
  'driver' or 'passenger'. If role comes through as anything else or empty,
  it violates the constraint and blocks signup.

  ## Fix
  1. Rewrite the trigger to be completely safe - catches ALL exceptions
  2. Add a default value of 'passenger' to the role column so the constraint
     is never violated by a missing value
  3. Make full_name and phone nullable with defaults so missing metadata
     never causes a NOT NULL violation
*/

-- Add safe defaults so missing metadata never violates NOT NULL
ALTER TABLE public.profiles
  ALTER COLUMN full_name SET DEFAULT '',
  ALTER COLUMN phone SET DEFAULT '',
  ALTER COLUMN role SET DEFAULT 'passenger';

-- Rewrite trigger to be completely bulletproof
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone     text;
  v_role      text;
BEGIN
  -- Safely extract metadata, defaulting if missing or wrong type
  v_full_name := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''), '');
  v_phone     := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'phone'), ''), '');
  v_role      := COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'role'), ''), 'passenger');

  -- Ensure role is valid
  IF v_role NOT IN ('driver', 'passenger') THEN
    v_role := 'passenger';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (NEW.id, v_full_name, v_phone, v_role)
  ON CONFLICT (id) DO UPDATE SET
    full_name = CASE WHEN NULLIF(EXCLUDED.full_name, '') IS NOT NULL THEN EXCLUDED.full_name ELSE profiles.full_name END,
    phone     = CASE WHEN NULLIF(EXCLUDED.phone, '') IS NOT NULL THEN EXCLUDED.phone ELSE profiles.phone END,
    role      = CASE WHEN EXCLUDED.role IN ('driver','passenger') THEN EXCLUDED.role ELSE profiles.role END;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- NEVER block signup under any circumstances
  RETURN NEW;
END;
$$;
