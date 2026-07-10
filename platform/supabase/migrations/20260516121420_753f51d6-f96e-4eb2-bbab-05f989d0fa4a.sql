
-- 1. Storage: remove broad "Service can manage catalogues" ALL policy; add owner+admin scoped policies
DROP POLICY IF EXISTS "Service can manage catalogues" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload catalogues" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload catalogues" ON storage.objects;

CREATE POLICY "Catalogues: owner or admin can insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'catalogues'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Catalogues: owner or admin can update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'catalogues'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

CREATE POLICY "Catalogues: owner or admin can delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'catalogues'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'super_admin')
    )
  );

-- Ensure catalogues bucket is private
UPDATE storage.buckets SET public = false WHERE id = 'catalogues';

-- 2. catalogue_lots: hide sensitive financial / buyer columns from non-admins via column grants
REVOKE SELECT ON public.catalogue_lots FROM anon, authenticated;
GRANT SELECT (
  id, catalogue_id, horse_name, sex, dob, color, sire, dam, dam_sire,
  breeder, consignor, lot_number, lot_type, year_born, is_unnamed,
  vat_status, has_raced, race_summary, bha_rating, earnings,
  turf_runs, turf_wins, aw_runs, aw_wins, last_3_starts, dam_race_record,
  dam_foals, dam2_name, dam2_record, dam3_name, notable_relatives,
  covered_by, in_foal, last_service_date, potential_score, potential_flags,
  potential_summary, sire_sire, sire_dam, sire_sire_sire, dam_dam,
  analyst_scores, description, pedigree_raw, pedigree_g2, pedigree_g3,
  pedigree_g4, pedigree_complete, siblings_full, sire_profile, dam_profile,
  inbreeding_coefficient, dosage_di, nick_rating, overall_score,
  chunk_index, lot_status, enriched_at, created_at, currency, withdrawn, raw_text
) ON public.catalogue_lots TO authenticated;
-- buyer, sold_price, reserve_price intentionally excluded from authenticated grant

-- Admin-only policy already exists ("Admins can manage catalogue_lots") so full access remains for super_admin via table-level grant on owner role.
GRANT ALL ON public.catalogue_lots TO service_role;

-- 3. catalogues: hide internal storage paths from non-admins
REVOKE SELECT ON public.catalogues FROM anon, authenticated;
GRANT SELECT (
  id, auction_house, sale_name, sale_date, sale_year, total_lots,
  total_chunks, processed_chunks, processed_lots, status,
  pdf_processed, catalog_hash, file_size_mb, created_at, updated_at
) ON public.catalogues TO authenticated;
-- storage_path, storage_url, source_url, pdf_url excluded
GRANT ALL ON public.catalogues TO service_role;

-- 4. SECURITY DEFINER functions: revoke broad EXECUTE
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_db_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Keep has_role / get_user_role / use_analysis_credit callable by authenticated (needed by RLS / app)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.use_analysis_credit(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_db_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.use_analysis_credit(uuid) TO authenticated, service_role;
