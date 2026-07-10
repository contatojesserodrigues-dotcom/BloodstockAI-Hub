
CREATE TABLE public.catalogue_uploads_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  catalogue_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.catalogue_uploads_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own catalogue uploads"
  ON public.catalogue_uploads_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own catalogue uploads"
  ON public.catalogue_uploads_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
