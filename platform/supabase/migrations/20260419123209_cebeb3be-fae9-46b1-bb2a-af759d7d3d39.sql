-- Remove user xenophona2000@yahoo.com from platform and newsletter
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'xenophona2000@yahoo.com';

  -- Remove from newsletter
  DELETE FROM public.newsletter_subscribers WHERE LOWER(email) = 'xenophona2000@yahoo.com';
  DELETE FROM public.plan_inquiries WHERE LOWER(email) = 'xenophona2000@yahoo.com';

  IF v_user_id IS NOT NULL THEN
    -- Cleanup user-related rows that might block deletion
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE user_id = v_user_id;
    DELETE FROM public.activity_logs WHERE user_id = v_user_id;
    DELETE FROM public.search_history WHERE user_id = v_user_id;
    DELETE FROM public.analysis_feedback WHERE user_id = v_user_id;
    DELETE FROM public.analysis_reports WHERE user_id = v_user_id;
    DELETE FROM public.broodmare_plans WHERE user_id = v_user_id;
    DELETE FROM public.matings WHERE user_id = v_user_id;
    DELETE FROM public.pdf_uploads WHERE user_id = v_user_id;
    DELETE FROM public.extracted_data WHERE user_id = v_user_id;
    DELETE FROM public.catalogue_uploads_log WHERE user_id = v_user_id;
    DELETE FROM public.payments WHERE user_id = v_user_id;
    DELETE FROM public.report_purchases WHERE user_id = v_user_id;
    DELETE FROM public.invoices WHERE customer_id = v_user_id;

    -- Finally remove the auth user
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;