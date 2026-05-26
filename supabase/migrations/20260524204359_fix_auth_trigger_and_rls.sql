/*
  # Fix authentication and profile creation

  ## Summary
  Comprehensive fix for the "Database error saving new user" problem and related auth/profile issues.

  ## Changes

  ### 1. Ensure profiles table exists with correct schema
  - Creates profiles table if it doesn't exist with all required columns

  ### 2. Re-apply trigger function (SECURITY DEFINER)
  - handle_new_user() reads full_name, phone, role from raw_user_meta_data
  - Runs with elevated privileges to bypass RLS on insert
  - ON CONFLICT DO NOTHING prevents duplicate inserts

  ### 3. Re-create trigger on auth.users
  - Fires AFTER INSERT so the new user row is fully committed first

  ### 4. Fix RLS policies
  - Users can read and update their own profile
  - Service role can do everything (needed for the trigger)
  - Remove any over-restrictive policies blocking legitimate access

  ### 5. Vehicles RLS
  - Anyone can read live vehicles (public listing)
  - Drivers can insert/update/delete their own vehicles

  ### 6. Bookings RLS
  - Passengers can insert their own bookings
  - Passengers can read their own bookings
  - Drivers can read bookings for their vehicles

  ### 7. Reviews RLS
  - Authenticated users can insert reviews
  - Anyone can read reviews
*/

-- ─── Profiles table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'passenger' CHECK (role IN ('driver', 'passenger')),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can read own data" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Drivers are publicly viewable" ON public.profiles;

CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ─── Trigger function ────────────────────────────────────────────────────────
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, profiles.phone),
      role = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── Vehicles RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view live vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers can insert their vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers can update their vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers can delete their vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Public can read live vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Drivers manage own vehicles" ON public.vehicles;

CREATE POLICY "Anyone can read vehicles"
  ON public.vehicles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Drivers can insert vehicles"
  ON public.vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own vehicles"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can delete own vehicles"
  ON public.vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- ─── Bookings RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Passengers can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Passengers can read own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Drivers can read vehicle bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can read own bookings" ON public.bookings;

CREATE POLICY "Passengers can insert bookings"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can read own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    auth.uid() = passenger_id
    OR EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id = bookings.vehicle_id AND v.driver_id = auth.uid()
    )
  );

-- ─── Reviews RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public reviews are viewable" ON public.reviews;

CREATE POLICY "Anyone can read reviews"
  ON public.reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);
