GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon, authenticated, service_role;

ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS colour text,
  ADD COLUMN IF NOT EXISTS cob text,
  ADD COLUMN IF NOT EXISTS bonus_schemes text,
  ADD COLUMN IF NOT EXISTS x_rays_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scoping_video_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS repository_url text,
  ADD COLUMN IF NOT EXISTS sire_notes_html text,
  ADD COLUMN IF NOT EXISTS first_dam_notes_html text,
  ADD COLUMN IF NOT EXISTS second_dam_notes_html text,
  ADD COLUMN IF NOT EXISTS third_dam_notes_html text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS sold_price integer,
  ADD COLUMN IF NOT EXISTS auction_sale_name text,
  ADD COLUMN IF NOT EXISTS sale_stage text NOT NULL DEFAULT 'pre_sale';

UPDATE public.marketplace_listings
SET
  colour = COALESCE(colour, 'Bay'),
  cob = COALESCE(cob, 'NZ'),
  bonus_schemes = COALESCE(bonus_schemes, ''),
  x_rays_available = true,
  scoping_video_available = true,
  repository_url = COALESCE(repository_url, '#repository'),
  auction_sale_name = COALESCE(auction_sale_name, '2026 Gold Coast National Yearling Sale 01 -02 June'),
  sale_stage = COALESCE(NULLIF(sale_stage, ''), 'pre_sale'),
  sire_notes_html = COALESCE(sire_notes_html, '<p><strong>EL ROCA (AUS)</strong> (Bay 2010-Stud 2015). 3 wins to 1200m, ATC Eskimo Prince S., L. Sire of 328 runners, 205 winners, 14 stakes winners, including SW Travelling Light, Romancing the Moon, Paleontologist, White Noise and further high-class performers across Australasia.</p>'),
  first_dam_notes_html = COALESCE(first_dam_notes_html, '<p><strong>1st dam</strong></p><p><strong>LOCH LEVEN</strong> (AUS), by General Nediym. Dam of winners and commercial performers. This colt is by El Roca and presents as a New Zealand-bred yearling from a proven Australasian family.</p>'),
  second_dam_notes_html = COALESCE(second_dam_notes_html, '<p><strong>2nd dam</strong></p><p>Family includes multiple winners and black-type performers with speed and juvenile performance represented through the page.</p>'),
  third_dam_notes_html = COALESCE(third_dam_notes_html, '<p><strong>3rd dam</strong></p><p>Established producing family with depth through the female line and continued commercial relevance in Australasian sales rings.</p>'),
  pedigree_json = CASE
    WHEN pedigree_json IS NULL OR pedigree_json = '{}'::jsonb THEN jsonb_build_object(
      'sire', 'EL ROCA',
      'dam', 'LOCH LEVEN',
      'sire_sire', 'FASTNET ROCK',
      'sire_dam', 'RUBIMILL',
      'dam_sire', 'GENERAL NEDIYM',
      'dam_dam', 'PRESINA',
      'sire_sire_sire', 'DANEHILL',
      'sire_sire_dam', 'PICCADILLY CIRCUS',
      'sire_dam_sire', 'RUBITON',
      'sire_dam_dam', 'MILL RANI',
      'dam_sire_sire', 'NEDIYM',
      'dam_sire_dam', 'MILITARY BELLE',
      'dam_dam_sire', 'PRESIDIUM',
      'dam_dam_dam', 'AMALFI LASS',
      'sire_year', '2010',
      'dam_year', '2007'
    )
    ELSE pedigree_json
  END
WHERE reference_code = 'Lot 869';