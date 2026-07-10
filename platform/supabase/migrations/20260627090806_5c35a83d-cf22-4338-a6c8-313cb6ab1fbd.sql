
ALTER TABLE public.inspection_analyses
  ADD COLUMN IF NOT EXISTS flag text NOT NULL DEFAULT 'none' CHECK (flag IN ('none','favourite','shortlist','reject','vet_check','follow_up','high_interest')),
  ADD COLUMN IF NOT EXISTS pedigree_meta jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_research jsonb,
  ADD COLUMN IF NOT EXISTS pedigree_annotations jsonb,
  ADD COLUMN IF NOT EXISTS market_estimate jsonb,
  ADD COLUMN IF NOT EXISTS roi_projection jsonb,
  ADD COLUMN IF NOT EXISTS buyer_notes text;

CREATE INDEX IF NOT EXISTS inspection_analyses_flag_idx ON public.inspection_analyses(user_id, flag);

DO $$ BEGIN
  CREATE POLICY "Users read own inspection pedigrees"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'inspection-pedigrees' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users upload own inspection pedigrees"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'inspection-pedigrees' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own inspection pedigrees"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'inspection-pedigrees' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users delete own inspection pedigrees"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'inspection-pedigrees' AND (auth.uid())::text = (storage.foldername(name))[1]);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
