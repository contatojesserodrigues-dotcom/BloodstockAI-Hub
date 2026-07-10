
DROP POLICY IF EXISTS "Authenticated can view catalogues" ON public.catalogues;
DROP POLICY IF EXISTS "Authenticated can view catalogue_lots" ON public.catalogue_lots;

CREATE POLICY "Users can view granted catalogues"
ON public.catalogues
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_catalog_access uca
    WHERE uca.catalog_id = catalogues.id AND uca.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view lots of granted catalogues"
ON public.catalogue_lots
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_catalog_access uca
    WHERE uca.catalog_id = catalogue_lots.catalogue_id AND uca.user_id = auth.uid()
  )
);
