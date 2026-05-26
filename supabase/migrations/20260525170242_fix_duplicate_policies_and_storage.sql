
/*
  # Fix duplicate RLS policies and create storage bucket

  ## Problem
  Multiple migrations created duplicate policies on profiles and vehicles,
  causing unpredictable behavior. Also, vehicle-images storage bucket
  is missing, causing photo uploads to fail silently.

  ## Changes
  1. Drop all duplicate policies on profiles and vehicles
  2. Recreate single clean policies for each table
  3. Create vehicle-images storage bucket (public)
  4. Add storage policies for vehicle image uploads
*/

-- ── PROFILES: drop all duplicates, recreate clean ──────────────────────────
DROP POLICY IF EXISTS "Profiles are publicly readable" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── VEHICLES: drop all duplicates, recreate clean ──────────────────────────
DROP POLICY IF EXISTS "Anyone can read vehicles" ON vehicles;
DROP POLICY IF EXISTS "Public can view live vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can insert vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can insert their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can update their own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can delete own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Drivers can delete their own vehicles" ON vehicles;

CREATE POLICY "vehicles_select_public"
  ON vehicles FOR SELECT
  USING (true);

CREATE POLICY "vehicles_insert_own"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "vehicles_update_own"
  ON vehicles FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "vehicles_delete_own"
  ON vehicles FOR DELETE
  TO authenticated
  USING (auth.uid() = driver_id);

-- ── STORAGE: create vehicle-images bucket ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies (drop if exist first)
DROP POLICY IF EXISTS "vehicle_images_select" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_update" ON storage.objects;
DROP POLICY IF EXISTS "vehicle_images_delete" ON storage.objects;

CREATE POLICY "vehicle_images_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

CREATE POLICY "vehicle_images_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle_images_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "vehicle_images_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vehicle-images' AND auth.uid()::text = (storage.foldername(name))[1]);
