UPDATE profiles
SET trial_credits = 5, trial_credits_used = 0, credits_remaining = 5
WHERE email IN (
  'paulharley@ymail.com',
  'matt@stroudcoleman.com',
  'emilio@ofagro.com.br',
  'Jamie@JPbloodstock.co.uk',
  'mouse81@hotmail.com',
  'tdooley@goffs.com',
  'louisvambeck@gmail.com',
  'agentbloodstockai@gmail.com'
);