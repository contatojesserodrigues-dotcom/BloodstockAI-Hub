INSERT INTO public.authorized_users (email, role, full_access, can_edit)
VALUES ('contarojesserodrigues@gmail.com', 'super_admin', true, false)
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    full_access = true,
    can_edit = COALESCE(public.authorized_users.can_edit, false);

CREATE OR REPLACE VIEW public.marketplace_listings_public AS
SELECT
  id,
  created_at,
  updated_at,
  horse_name,
  reference_code,
  date_of_birth,
  sex,
  breed,
  sire,
  dam,
  dam_sire,
  consignor_name,
  country,
  guide_price,
  offers_close_at,
  status,
  description_html,
  pedigree_json,
  report_pdf_url,
  video_url,
  photos,
  created_by,
  category,
  colour,
  cob,
  bonus_schemes,
  x_rays_available,
  scoping_video_available,
  repository_url,
  sire_notes_html,
  first_dam_notes_html,
  second_dam_notes_html,
  third_dam_notes_html,
  auction_sale_name,
  sale_stage
FROM public.marketplace_listings
WHERE status IN ('active', 'sold');

GRANT SELECT ON public.marketplace_listings_public TO anon, authenticated;
GRANT ALL ON public.marketplace_listings_public TO service_role;

REVOKE SELECT (buyer_name, sold_price) ON public.marketplace_listings FROM anon, authenticated;