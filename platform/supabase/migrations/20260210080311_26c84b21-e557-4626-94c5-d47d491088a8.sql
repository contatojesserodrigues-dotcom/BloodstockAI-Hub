
-- Step 1: user_roles - add SELECT policy for own roles only
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 2: Fix activity_logs INSERT policy
DROP POLICY "System can insert logs" ON public.activity_logs;
CREATE POLICY "Users can insert own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Step 3: Add DELETE policies for user-owned tables
CREATE POLICY "Users can delete own uploads"
  ON public.pdf_uploads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own extracted data"
  ON public.extracted_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Step 7: Fix update_updated_at_column search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;
