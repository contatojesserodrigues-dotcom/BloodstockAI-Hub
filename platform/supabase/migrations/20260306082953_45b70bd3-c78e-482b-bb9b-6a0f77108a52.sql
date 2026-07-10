
-- Add INSERT policy for usage_tracking
CREATE POLICY "Service can insert usage tracking" ON public.usage_tracking
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
