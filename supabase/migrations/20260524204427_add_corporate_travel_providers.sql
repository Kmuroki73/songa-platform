/*
  # Corporate Travel Providers & Cargo Companies

  ## Summary
  Adds tables for the two new marketplace features:
  1. Corporate travel providers (hotels, tour companies, travel agencies)
  2. Cargo logistics companies

  ## New Tables

  ### corporate_providers
  - Companies offering corporate travel packages
  - Hotels, tour operators, travel agencies
  - Includes packages array, destinations, pricing, images

  ### cargo_companies
  - Logistics companies offering freight services
  - Operating regions, routes, fleet info, pricing

  ### corporate_provider_inquiries
  - Contact requests from corporate clients to providers

  ### cargo_company_inquiries
  - Booking requests to cargo companies

  ## Security
  - Public can browse providers/companies
  - Only authenticated users can register as providers
  - Owners can update their own listings
  - Inquiry inserts require authentication
*/

-- ─── Corporate providers ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.corporate_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category text NOT NULL DEFAULT 'hotel' CHECK (category IN ('hotel','tour_operator','travel_agency','conference_venue','car_hire')),
  company_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  destinations text[] NOT NULL DEFAULT '{}',
  locations text[] NOT NULL DEFAULT '{}',
  packages jsonb NOT NULL DEFAULT '[]',
  accommodation_types text[] NOT NULL DEFAULT '{}',
  transport_options text[] NOT NULL DEFAULT '{}',
  food_options text[] NOT NULL DEFAULT '{}',
  min_price_kes integer NOT NULL DEFAULT 0,
  max_price_kes integer NOT NULL DEFAULT 0,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  policies text NOT NULL DEFAULT '',
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.corporate_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active providers"
  ON public.corporate_providers FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Owners can insert providers"
  ON public.corporate_providers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own providers"
  ON public.corporate_providers FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ─── Cargo companies ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cargo_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  operating_regions text[] NOT NULL DEFAULT '{}',
  delivery_routes jsonb NOT NULL DEFAULT '[]',
  cargo_types text[] NOT NULL DEFAULT '{}',
  fleet_info jsonb NOT NULL DEFAULT '{}',
  pricing_structure jsonb NOT NULL DEFAULT '{}',
  insurance_info text NOT NULL DEFAULT '',
  warehouse_info text NOT NULL DEFAULT '',
  min_delivery_days integer NOT NULL DEFAULT 1,
  max_delivery_days integer NOT NULL DEFAULT 7,
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  images text[] NOT NULL DEFAULT '{}',
  policies text NOT NULL DEFAULT '',
  rating numeric(3,2) NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.cargo_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active cargo companies"
  ON public.cargo_companies FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Owners can insert cargo companies"
  ON public.cargo_companies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update own cargo companies"
  ON public.cargo_companies FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ─── Corporate provider inquiries ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.corporate_provider_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES public.corporate_providers(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  travel_dates text NOT NULL DEFAULT '',
  employee_count integer NOT NULL DEFAULT 1,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','confirmed','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.corporate_provider_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert inquiries"
  ON public.corporate_provider_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can read own inquiries"
  ON public.corporate_provider_inquiries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1 FROM public.corporate_providers cp
      WHERE cp.id = corporate_provider_inquiries.provider_id AND cp.owner_id = auth.uid()
    )
  );

-- ─── Cargo company inquiries ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cargo_company_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.cargo_companies(id) ON DELETE CASCADE NOT NULL,
  requester_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT '',
  destination text NOT NULL DEFAULT '',
  cargo_type text NOT NULL DEFAULT '',
  weight_kg numeric NOT NULL DEFAULT 0,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','confirmed','closed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.cargo_company_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert cargo inquiries"
  ON public.cargo_company_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can read own cargo inquiries"
  ON public.cargo_company_inquiries FOR SELECT
  TO authenticated
  USING (
    auth.uid() = requester_id
    OR EXISTS (
      SELECT 1 FROM public.cargo_companies cc
      WHERE cc.id = cargo_company_inquiries.company_id AND cc.owner_id = auth.uid()
    )
  );

-- ─── Seed demo corporate providers ───────────────────────────────────────────
-- (no owner_id required for seeds — we'll use a placeholder system approach)
-- Actual providers register through the UI; these are display examples only.
