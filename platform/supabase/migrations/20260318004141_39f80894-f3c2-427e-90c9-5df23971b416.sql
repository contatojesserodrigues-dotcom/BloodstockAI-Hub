
DROP POLICY "Service can insert invoices" ON public.invoices;
CREATE POLICY "Service can insert own invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);
