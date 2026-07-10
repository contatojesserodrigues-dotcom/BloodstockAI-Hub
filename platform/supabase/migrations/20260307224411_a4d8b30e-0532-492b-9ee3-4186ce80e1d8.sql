UPDATE profiles
SET credits_remaining = 0, trial_credits_used = 5
WHERE email IN (
  'brunodepauloalmeida@gmail.com',
  'seanfreneybloodstock@gmail.com',
  'mktdigitalagile@gmail.com',
  'vcsoares42@gmail.com'
);