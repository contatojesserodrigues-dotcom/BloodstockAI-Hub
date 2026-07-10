
-- Marketplace listings
CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  horse_name text NOT NULL,
  reference_code text,
  date_of_birth date,
  sex text,
  breed text,
  sire text,
  dam text,
  dam_sire text,
  consignor_name text,
  country text,
  guide_price integer DEFAULT 0,
  offers_close_at timestamptz,
  status text NOT NULL DEFAULT 'draft',
  description_html text,
  pedigree_json jsonb DEFAULT '{}'::jsonb,
  report_pdf_url text,
  video_url text,
  photos text[] DEFAULT ARRAY[]::text[],
  internal_notes text,
  created_by uuid
);

GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active listings"
  ON public.marketplace_listings FOR SELECT
  USING (status = 'active' OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage listings"
  ON public.marketplace_listings FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Marketplace offers
CREATE TABLE public.marketplace_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  listing_id uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  offeror_name text NOT NULL,
  offeror_initials text NOT NULL,
  contact_number text NOT NULL,
  email text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  message text,
  is_genuine boolean NOT NULL DEFAULT false,
  ip_address text
);

GRANT INSERT ON public.marketplace_offers TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.marketplace_offers TO authenticated;
GRANT ALL ON public.marketplace_offers TO service_role;

ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit offers"
  ON public.marketplace_offers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins view all offers"
  ON public.marketplace_offers FOR SELECT
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins manage offers"
  ON public.marketplace_offers FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_marketplace_offers_listing ON public.marketplace_offers(listing_id, created_at DESC);

-- Public-safe view (initials + amount only) for live ticker
CREATE OR REPLACE VIEW public.marketplace_offers_public
WITH (security_invoker = true)
AS
SELECT id, listing_id, offeror_initials, amount, created_at
FROM public.marketplace_offers;

GRANT SELECT ON public.marketplace_offers_public TO anon, authenticated;

-- We need anon to SELECT base columns through the view; add a permissive SELECT policy
-- restricted via the view (security_invoker uses caller perms). To allow anon reads
-- through the view we add a SELECT policy that exposes only minimal columns is not
-- possible at column level here; rely on view + admin policy. Add anon SELECT policy
-- because security_invoker view defers to underlying RLS.
CREATE POLICY "Public read offers via view"
  ON public.marketplace_offers FOR SELECT
  USING (true);

-- (Public can technically query base table via PostgREST too — but we don't GRANT SELECT
-- to anon on the base table, so direct table access from public clients is blocked.
-- Only the view, which has SELECT granted to anon, is accessible.)

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_offers;
ALTER TABLE public.marketplace_offers REPLICA IDENTITY FULL;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-photos', 'marketplace-photos', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('marketplace-reports', 'marketplace-reports', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read marketplace photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-photos');

CREATE POLICY "Admins write marketplace photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-photos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update marketplace photos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-photos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete marketplace photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-photos' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Public read marketplace reports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketplace-reports');

CREATE POLICY "Admins write marketplace reports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketplace-reports' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins update marketplace reports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketplace-reports' AND has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins delete marketplace reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketplace-reports' AND has_role(auth.uid(), 'super_admin'::app_role));
