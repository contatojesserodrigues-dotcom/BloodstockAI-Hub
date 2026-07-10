interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlHours: number;
  source: string;
}

const CACHE_TTL = {
  pedigree: 720,
  performance: 24,
  ratings: 168,
  marketInsights: 6,
  breeding: 168,
};

export class BloodstockCache {
  private prefix = "bai_";

  set<T>(key: string, data: T, type: keyof typeof CACHE_TTL, source: string): void {
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlHours: CACHE_TTL[type],
      source,
    };
    try {
      sessionStorage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch {
      this.evictOldest();
    }
  }

  get<T>(key: string, type: keyof typeof CACHE_TTL): T | null {
    const raw = sessionStorage.getItem(this.prefix + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    const ageHours = (Date.now() - entry.cachedAt) / (1000 * 60 * 60);
    if (ageHours > CACHE_TTL[type]) {
      sessionStorage.removeItem(this.prefix + key);
      return null;
    }
    return entry.data;
  }

  buildKey(horseName: string, country: string, type: string): string {
    return `${type}_${horseName.toLowerCase().replace(/\s+/g, "_")}_${country.toLowerCase()}`;
  }

  private evictOldest(): void {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(this.prefix));
    if (keys.length > 0) sessionStorage.removeItem(keys[0]);
  }
}

export const bloodstockCache = new BloodstockCache();
