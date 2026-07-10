
-- 1. Owner UPDATE/DELETE on analysis_reports
CREATE POLICY "Users can update own reports"
  ON public.analysis_reports
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.analysis_reports
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Remove marketplace_offers from realtime + add sanitized event table
ALTER PUBLICATION supabase_realtime DROP TABLE public.marketplace_offers;

CREATE TABLE public.marketplace_offer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_offer_events TO anon, authenticated;
GRANT ALL ON public.marketplace_offer_events TO service_role;

ALTER TABLE public.marketplace_offer_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read offer pulses"
  ON public.marketplace_offer_events
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_marketplace_offer_events_listing ON public.marketplace_offer_events(listing_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_offer_events;

CREATE OR REPLACE FUNCTION public.emit_marketplace_offer_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.marketplace_offer_events (listing_id) VALUES (NEW.listing_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_marketplace_offers_emit_event
AFTER INSERT ON public.marketplace_offers
FOR EACH ROW
EXECUTE FUNCTION public.emit_marketplace_offer_event();

-- 3. Revoke anon EXECUTE on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.get_db_stats() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.use_analysis_credit(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.emit_marketplace_offer_event() FROM anon, public;

GRANT EXECUTE ON FUNCTION public.get_db_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_catalogue_lots(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_processed_lots(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.use_analysis_credit(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
-- get_public_offers stays publicly executable (intentional anonymous read of sanitized offers)
