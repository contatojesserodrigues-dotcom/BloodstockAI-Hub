-- Insert OBS March 2026 Report in two versions: free (Weekly Reports) and paid ($790)
INSERT INTO public.published_reports (title, description, report_type, pdf_url, price, auction_house, published_at)
VALUES
  (
    'OBS March 2026 — Weekly Auction Report',
    'Comprehensive weekly analysis of the OBS March 2026 sale: top lots, pedigree highlights, market trends and breeze-up performance insights. Free for all subscribers.',
    'auction',
    'reports/BloodstockAI_OBS_March_2026_Report.pdf',
    0,
    'obs',
    NOW()
  ),
  (
    'OBS March 2026 — Premium Market Intelligence Report',
    'Full premium intelligence dossier for OBS March 2026: deep pedigree analysis, breeze-up biomechanics, ROI projections, value lots, hot bloodlines and complete market commentary. Instant download — no account required.',
    'trends',
    'reports/BloodstockAI_OBS_March_2026_Report.pdf',
    790,
    'obs',
    NOW()
  );