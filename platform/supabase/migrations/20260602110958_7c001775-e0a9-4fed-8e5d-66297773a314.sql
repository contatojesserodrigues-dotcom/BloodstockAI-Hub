
-- Owners can manage their own broodmare plans
CREATE POLICY "Users can update own broodmare plans"
  ON public.broodmare_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own broodmare plans"
  ON public.broodmare_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Owners can manage their own matings
CREATE POLICY "Users can update own matings"
  ON public.matings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own matings"
  ON public.matings FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all usage tracking records
CREATE POLICY "Admins can view all usage tracking"
  ON public.usage_tracking FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Lock down SECURITY DEFINER functions that should not be callable by anonymous visitors
REVOKE EXECUTE ON FUNCTION public.get_db_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.use_analysis_credit(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_db_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_analysis_credit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) TO authenticated;
