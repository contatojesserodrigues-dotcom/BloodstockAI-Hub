export const PIPELINE_CONFIG = {
  search: {
    maxSitesPerQuery: 3,
    confidenceThreshold: 0.85,
    timeoutMs: 8000,
    retryAttempts: 2,
    temperature: 0.1,
  },
  cache: {
    pedigreeHours: 720,
    performanceHours: 24,
    ratingsHours: 168,
    marketInsightsHours: 6,
    breedingHours: 168,
  },
  ai: {
    model: "claude-opus-4-20250514",
    maxTokensAnalysis: 4000,
    maxTokensCatalog: 8000,
    maxTokensReport: 3000,
  },
};

// APPROVED DATA SOURCES — OPEN ACCESS ONLY
// No paywall, login, or subscription sites
export const APPROVED_SOURCES = [
  "racingpost.com",
  "equibase.com",
  "racing.com.au",
  "jra.go.jp",
  "pedigreequery.com",
  "allbreedpedigree.com",
  "tbheritage.com",
  "trc-global-rankings.com",
  "keeneland.com",
  "tattersalls.com",
  "fasigtipton.com",
  "magicmillions.com.au",
  "arqana.com",
  "thoroughbreddailynews.com",
  "bloodhorse.com",
  "jockeyclubbrasileiro.com.br",
  "jra.go.jp/datafile",
  "racingaustralia.horse",
];

export const SITE_TIERS = {
  pedigree: {
    tier1: [
      "pedigreequery.com",
      "allbreedpedigree.com",
      "tbheritage.com",
      "jockeyclubbrasileiro.com.br",
    ],
    tier2: [
      "racingpost.com",
      "racingaustralia.horse",
    ],
  },
  performance: {
    tier1: [
      "racingpost.com",
      "equibase.com",
      "racing.com.au",
      "jra.go.jp",
    ],
    tier2: [
      "trc-global-rankings.com",
      "jockeyclubbrasileiro.com.br",
      "racingaustralia.horse",
    ],
  },
  marketInsights: {
    tier1: [
      "bloodhorse.com",
      "thoroughbreddailynews.com",
    ],
  },
  breeding: {
    tier1: [
      "pedigreequery.com",
      "racingpost.com",
      "tbheritage.com",
    ],
    tier2: [
      "bloodhorse.com",
      "thoroughbreddailynews.com",
      "jockeyclubbrasileiro.com.br",
    ],
  },
};
