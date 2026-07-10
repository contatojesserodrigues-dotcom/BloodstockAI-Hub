
INSERT INTO public.marketplace_listings (
  horse_name, reference_code, date_of_birth, sex, breed, sire, dam, dam_sire,
  consignor_name, country, category, colour, cob, bonus_schemes,
  auction_sale_name, sale_stage,
  guide_price, status, description_html, pedigree_json, report_pdf_url, video_url, photos,
  sire_notes_html, first_dam_notes_html, second_dam_notes_html, third_dam_notes_html
) VALUES (
  'State of Rest × Thousandfold (IRE)',
  'Lot 49',
  '2024-01-25',
  'Colt',
  'Thoroughbred',
  'State of Rest (IRE)',
  'Thousandfold (USA)',
  'Quiet American',
  'Woodlands Lodge',
  'IRE',
  'Breeze-Up/2YO',
  'Chesnut',
  'IRE',
  'E.B.F. Nominated • B.C. Nominated • IRE Qualified',
  'Goffs Classic Breeze-Up Sale 2026',
  'pre_sale',
  58000,
  'active',
  '<p>Athletic, well-balanced chesnut colt with excellent breeze biomechanics — full extension reading 150% body length, balanced 51/49 weight distribution and shoulder/hip angles within ideal range. BloodstockAI Score: <strong>76/100 (Good)</strong>. Cross-referenced pedigree rating 7.0/10 with strong black-type female family (3rd dam Juno Madonna by Sadler''s Wells; family of LINE OF DUTY (Gr.1), JACKIE OH (Gr.3), MO D''AMOUR (L) and KAZAN (Gr.2 placed)). Suitable for European turf 2YO programmes and US turf juveniles.</p>',
  jsonb_build_object(
    'sire', 'State of Rest (IRE)',
    'sire_sire', 'Starspangledbanner',
    'sire_sire_sire', 'Choisir',
    'sire_sire_dam', 'Gold Anthem',
    'sire_dam', 'Repose',
    'sire_dam_sire', 'Giant''s Causeway',
    'sire_dam_dam', 'Salut d''Amour',
    'dam', 'Thousandfold (USA)',
    'dam_year', '2010',
    'dam_sire', 'Quiet American',
    'dam_sire_sire', 'Fappiano',
    'dam_sire_dam', 'Believe It',
    'dam_dam', 'Salut d''Amour (IRE)',
    'dam_dam_sire', 'Danehill Dancer',
    'dam_dam_dam', 'Juno Madonna',
    'videos', jsonb_build_array(
      jsonb_build_object(
        'title', 'Breeze-Up Gallop — Goffs Classic Breeze-Up Sale 2026',
        'url',   'https://www.youtube.com/watch?v=3_Y4gphTBfg',
        'provider', 'youtube'
      ),
      jsonb_build_object(
        'title', 'Official Goffs Lot 49 — Catalogue Page',
        'url',   'https://www.goffs.com/sale/IRE/classic-breeze-up-sale-2026/lots/49',
        'provider', 'external'
      )
    )
  ),
  '/__l5e/assets-v1/f02d0f44-f4e7-47f2-aea1-2199ed2511cd/lot49_49_Breezeup_Danielle.pdf',
  'https://www.youtube.com/watch?v=3_Y4gphTBfg',
  ARRAY[
    '/__l5e/assets-v1/11fa207b-6f6a-40fd-ba01-c375e01f7327/lot49_IMG_3582.JPG',
    '/__l5e/assets-v1/8f990d80-e496-45ec-b456-59bb527f4499/lot49_IMG_3583.JPG',
    '/__l5e/assets-v1/790a7f53-cd30-4a48-b054-efc59e67122e/lot49_IMG_3541_2.JPG',
    '/__l5e/assets-v1/1e2af042-1183-4bb6-9861-872ff8606aef/lot49_84288b56-f2c6-4ff1-b538-e6e70caa8897_2.JPG',
    '/__l5e/assets-v1/efc0bb32-d363-4587-b85f-552a97b7fee4/lot49_IMG_3542_2.JPG',
    '/__l5e/assets-v1/f8951a40-b037-474c-be3d-495dda1f2d2b/lot49_IMG_3571.jpg',
    '/__l5e/assets-v1/5200fab7-a19d-4805-8bf6-e10ec5c16912/lot49_IMG_3574.jpg',
    '/__l5e/assets-v1/bc156771-0050-4683-8d67-9234344187bd/lot49_IMG_3566.jpg'
  ]::text[],
  '<p><strong>STATE OF REST (IRE)</strong> — Winner of the Saratoga Derby Invitational (Gr.1), Cox Plate (Gr.1), Prix Ganay (Gr.1) and Prince of Wales''s Stakes (Gr.1). One of the most accomplished young sires standing in Europe, transmitting class, soundness and middle-distance turf aptitude. First crop already showing precocious 2YO ability on both sides of the Atlantic.</p>',
  '<p><strong>1st dam — THOUSANDFOLD (USA)</strong>: ran in U.S.A.; dam of 7 foals; 6 runners; 4 winners including <strong>KAZAN (IRE)</strong> (6 wins, £267,654, 2nd Del Mar Derby Gr.2, 3rd Del Mar Juvenile Turf S. L.) and <strong>DEXTER BELLE (IRE)</strong> (2 wins, 3rd Westow S. L.).</p>',
  '<p><strong>2nd dam — SALUT D''AMOUR (IRE)</strong>: 2 wins at 2, £65,724 inc. National S. (L); 2nd Cherry Hinton S. (Gr.2), Queen Mary S. (Gr.2), Michael Seely Memorial Fillies'' S. (L); 3rd Nell Gwyn S. (Gr.3). Dam of 5 winners including <strong>SECRET ADMIRER</strong> (3rd Prix Aymeri de Mauléon, L.) and granddam of <strong>MO D''AMOUR</strong> (Busher S., L.; dam of Gr.2 winner SOUTHLAWN).</p>',
  '<p><strong>3rd dam — JUNO MADONNA (IRE)</strong> by Sadler''s Wells. Dam of <strong>REGIME (IRE)</strong> (5 wins inc. Mooresbridge S. Gr.3 & Classic Trial Gr.3, 2nd Prix Eugène Adam Gr.2). Granddam of <strong>JACQUELINE QUEST</strong> (2nd 1000 Guineas Gr.1) — dam of <strong>LINE OF DUTY</strong> (Breeders'' Cup Juvenile Turf Gr.1) and <strong>JACKIE OH</strong> (Rathbride Stakes Gr.3).</p>'
);
