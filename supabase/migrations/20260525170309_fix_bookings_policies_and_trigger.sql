
/*
  # Fix bookings RLS policies and auth trigger

  ## Problems
  1. Bookings table has duplicate INSERT and SELECT policies causing conflicts
  2. The handle_new_user trigger uses COALESCE which won't catch empty strings —
     this is fine since we use '' as a valid default, but the ON CONFLICT UPDATE
     should use NULLIF to avoid overwriting with empty strings
  3. SeatSelector needs to read completed bookings (seat occupancy) as unauthenticated
     user — needs a public SELECT policy for seat_number + vehicle_id only

  ## Changes
  - Drop all duplicate bookings policies, recreate clean set
  - Fix handle_new_user to use NULLIF so empty strings fall back to existing values
*/

-- ── BOOKINGS: clean up duplicate policies ──────────────────────────────────
DROP POLICY IF EXISTS "Users can view their own bookings" ON bookings;
DROP POLICY IF EXISTS "Passengers can create bookings" ON bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
DROP POLICY IF EXISTS "Public can view booked seats" ON bookings;
DROP POLICY IF EXISTS "Passengers can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Passengers can read own bookings" ON bookings;

-- Public can read completed bookings (for seat occupancy display)
CREATE POLICY "bookings_select_public_completed"
  ON bookings FOR SELECT
  USING (payment_status = 'completed');

-- Authenticated passengers can read all their own bookings (any status)
CREATE POLICY "bookings_select_own"
  ON bookings FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

-- Drivers can see bookings for their vehicles
CREATE POLICY "bookings_select_driver"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = bookings.vehicle_id AND v.driver_id = auth.uid()
    )
  );

CREATE POLICY "bookings_insert_own"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "bookings_update_own"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = passenger_id)
  WITH CHECK (auth.uid() = passenger_id);

-- ── FIX handle_new_user: use NULLIF so empty strings fall back gracefully ──
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
END;
$$;
