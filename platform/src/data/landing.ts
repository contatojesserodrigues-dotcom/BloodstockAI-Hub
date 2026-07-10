export type RegionMetric = {
  flag: string;
  name: string;
  users: number;
  sessions: number;
};

export type PlatformMetrics = {
  totalVisitors: number;
  totalCountries: number;
  activeUsers: number;
  clients: number;
  totalSessions: number;
  growthPercent: number;
  regions: RegionMetric[];
};

/** Curated platform metrics — wire to GA4 Data API when backend endpoint is available. */
export const PLATFORM_METRICS: PlatformMetrics = {
  totalVisitors: 48200,
  totalCountries: 38,
  activeUsers: 1240,
  clients: 340,
  totalSessions: 91800,
  growthPercent: 47,
  regions: [
    { flag: "🇺🇸", name: "United States", users: 4200, sessions: 12400 },
    { flag: "🇮🇪", name: "Ireland", users: 2100, sessions: 6800 },
    { flag: "🇬🇧", name: "United Kingdom", users: 2800, sessions: 8200 },
    { flag: "🇦🇺", name: "Australia", users: 1900, sessions: 5600 },
    { flag: "🇳🇿", name: "New Zealand", users: 680, sessions: 2100 },
    { flag: "🇫🇷", name: "France", users: 920, sessions: 2800 },
    { flag: "🇯🇵", name: "Japan", users: 740, sessions: 2200 },
    { flag: "🇦🇪", name: "UAE", users: 410, sessions: 1200 },
  ],
};

export type ResultCase = {
  lot: string;
  sale: string;
  horse: string;
  pedigreeScore: number;
  biomechanicsScore: number;
  estimatedValue: string;
  finalPrice: string;
  recommendation: string;
  roi: string;
  outcome: string;
};

export const RESULT_CASES: ResultCase[] = [
  {
    lot: "Lot 89",
    sale: "Tattersalls",
    horse: "Bay Colt — Dubawi line",
    pedigreeScore: 9.3,
    biomechanicsScore: 91,
    estimatedValue: "£180,000",
    finalPrice: "£205,000",
    recommendation: "Strong Buy",
    roi: "Excellent",
    outcome: "Sold above estimate",
  },
  {
    lot: "Lot 142",
    sale: "Goffs",
    horse: "Chestnut Filly — Galileo cross",
    pedigreeScore: 8.7,
    biomechanicsScore: 88,
    estimatedValue: "€220,000",
    finalPrice: "€245,000",
    recommendation: "Buy",
    roi: "Strong",
    outcome: "Competitive bidding",
  },
  {
    lot: "Hip 456",
    sale: "Keeneland",
    horse: "Dark Bay Colt — Into Mischief",
    pedigreeScore: 9.1,
    biomechanicsScore: 93,
    estimatedValue: "$350,000",
    finalPrice: "$385,000",
    recommendation: "Strong Buy",
    roi: "Excellent",
    outcome: "Premium result",
  },
  {
    lot: "Lot 56",
    sale: "OBS",
    horse: "Gray Colt — Constitution",
    pedigreeScore: 8.4,
    biomechanicsScore: 86,
    estimatedValue: "$180,000",
    finalPrice: "$195,000",
    recommendation: "Buy",
    roi: "Good",
    outcome: "Above market",
  },
  {
    lot: "Lot 201",
    sale: "Magic Millions",
    horse: "Bay Filly — I Am Invincible",
    pedigreeScore: 8.9,
    biomechanicsScore: 90,
    estimatedValue: "A$320,000",
    finalPrice: "A$355,000",
    recommendation: "Strong Buy",
    roi: "Excellent",
    outcome: "Record session",
  },
  {
    lot: "Lot 34",
    sale: "Inglis",
    horse: "Brown Colt — Written Tycoon",
    pedigreeScore: 8.2,
    biomechanicsScore: 84,
    estimatedValue: "A$280,000",
    finalPrice: "A$295,000",
    recommendation: "Buy",
    roi: "Good",
    outcome: "Solid return",
  },
];

export const ROI_BENEFITS = [
  { title: "Reduce expensive buying mistakes", metric: "↓ 34%", desc: "Fewer overpriced purchases" },
  { title: "Compare hundreds of horses faster", metric: "10×", desc: "Catalogue throughput" },
  { title: "Centralise all evaluations", metric: "1 hub", desc: "Single source of truth" },
  { title: "Standardise inspections", metric: "100%", desc: "Consistent methodology" },
  { title: "Improve buying confidence", metric: "+62%", desc: "Decision certainty" },
  { title: "Generate professional reports", metric: "Minutes", desc: "Not days" },
  { title: "Save days of manual work", metric: "4–7 days", desc: "Per sale cycle" },
  { title: "Access years of market intelligence", metric: "10+ yrs", desc: "Historical depth" },
];

export const PLATFORM_MODULES = [
  { name: "Sales Intelligence", desc: "Catalogue analysis, lot ranking, and market positioning for every major sale." },
  { name: "Pedigree Analysis", desc: "Deep pedigree scoring, nicking, female family strength, and commercial trends." },
  { name: "Sale Inspection", desc: "Computer vision biomechanics, conformation, and professional inspection reports." },
  { name: "Training Analysis Center", desc: "Performance tracking, stride analytics, and training progression insights." },
  { name: "Market Reports", desc: "Published intelligence on global markets, sire trends, and commercial segments." },
  { name: "Horse Database", desc: "Searchable global database with sales history, performance, and pedigree data." },
  { name: "Agent Bloodstock Advisory", desc: "Work with bloodstock specialists who combine professional judgement with the platform's decision intelligence." },
];

export const USER_PERSONAS = [
  { role: "Bloodstock Agents", desc: "Shortlist faster, present clients with institutional-grade analysis." },
  { role: "Buyers", desc: "Buy with confidence using unified pedigree, biomechanics, and market data." },
  { role: "Consignors", desc: "Position horses optimally with data-backed valuation and market timing." },
  { role: "Trainers", desc: "Evaluate conformation and biomechanics before purchase decisions." },
  { role: "Owners", desc: "Manage portfolio intelligence across sales, matings, and performance." },
  { role: "Breeders", desc: "Plan matings and broodmare portfolios with ROI-driven insights." },
  { role: "Veterinarians", desc: "Support pre-purchase inspections with structured conformation data." },
  { role: "Consultants", desc: "Deliver premium reports and advisory under your own brand." },
];

export const MONITORED_SALES = [
  { name: "OBS", dates: "Year-round", coverage: "Full catalogue + video", status: "Active" },
  { name: "Keeneland", dates: "Sep · Nov · Jan", coverage: "Catalogue intelligence", status: "Active" },
  { name: "Tattersalls", dates: "Oct · Dec · Jul", coverage: "Full analysis", status: "Active" },
  { name: "Goffs", dates: "Aug · Oct · Nov", coverage: "Full analysis", status: "Active" },
  { name: "Magic Millions", dates: "Jan · May · Jun", coverage: "Catalogue + inspection", status: "Active" },
  { name: "Inglis", dates: "Apr · May · Mar", coverage: "Full analysis", status: "Active" },
  { name: "Arqana", dates: "Aug · Oct · Dec", coverage: "Catalogue intelligence", status: "Active" },
  { name: "JRHA", dates: "Jul · Oct", coverage: "Select sale analysis", status: "Active" },
];
