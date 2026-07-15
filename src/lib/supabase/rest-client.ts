import { getSupabaseConfig } from "@/lib/supabase/server";

type QueryResult<T> = { data: T | null; error: { message: string } | null; count?: number | null };

class RestQueryBuilder {
  private filters: string[] = [];
  private selectCols = "*";
  private orderClause = "";
  private limitClause = "";
  private method: "GET" | "POST" | "PATCH" = "GET";
  private body: unknown;
  private prefer = "return=representation";
  private head = false;
  private isSingle = false;

  constructor(
    private readonly baseUrl: string,
    private readonly table: string,
    private readonly headers: Record<string, string>
  ) {}

  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.selectCols = columns;
    if (options?.head) {
      this.head = true;
      this.prefer = "count=exact";
    } else if (this.method === "POST" || this.method === "PATCH") {
      this.prefer = "return=representation";
    }
    return this;
  }

  insert(values: unknown) {
    this.method = "POST";
    this.body = values;
    return this;
  }

  update(values: unknown) {
    this.method = "PATCH";
    this.body = values;
    return this;
  }

  upsert(values: unknown) {
    this.method = "POST";
    this.body = values;
    this.prefer = "return=representation,resolution=merge-duplicates";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push(`${column}=eq.${encodeURIComponent(String(value))}`);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const dir = options?.ascending === false ? "desc" : "asc";
    this.orderClause = `order=${column}.${dir}`;
    return this;
  }

  limit(count: number) {
    this.limitClause = `limit=${count}`;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.executeSingle();
  }

  private buildQuery() {
    const params = [`select=${this.selectCols}`, ...this.filters, this.orderClause, this.limitClause].filter(Boolean);
    return params.join("&");
  }

  private async executeSingle(): Promise<QueryResult<Record<string, unknown>>> {
    const result = await this.execute<Record<string, unknown>[]>();
    if (result.error) return { data: null, error: result.error };
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    return { data: row || null, error: row ? null : { message: "No rows returned" } };
  }

  async execute<T>(): Promise<QueryResult<T>> {
    const query = this.buildQuery();
    const url = `${this.baseUrl}/${this.table}${query ? `?${query}` : ""}`;

    try {
      const res = await fetch(url, {
        method: this.method,
        headers: {
          ...this.headers,
          Prefer: this.prefer,
          ...(this.isSingle ? { Accept: "application/vnd.pgrst.object+json" } : {}),
        },
        body: this.body !== undefined ? JSON.stringify(this.body) : undefined,
        cache: "no-store",
      });

      if (this.head) {
        const countHeader = res.headers.get("content-range");
        const count = countHeader ? Number(countHeader.split("/")[1] || 0) : 0;
        if (!res.ok) {
          const text = await res.text();
          return { data: null, error: { message: text || res.statusText }, count: 0 };
        }
        return { data: null, error: null, count };
      }

      const text = await res.text();
      if (!res.ok) {
        return { data: null, error: { message: text || res.statusText } };
      }

      if (!text) return { data: [] as T, error: null };
      const parsed = JSON.parse(text) as T;
      return { data: parsed, error: null };
    } catch (err) {
      return { data: null, error: { message: err instanceof Error ? err.message : "Supabase request failed" } };
    }
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export interface SupabaseRestClient {
  from(table: string): RestQueryBuilder;
}

export function createSupabaseRestAdmin(): SupabaseRestClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.configured || !cfg.url || !cfg.serviceRoleKey) return null;

  const baseUrl = `${cfg.url}/rest/v1`;
  const headers = {
    apikey: cfg.serviceRoleKey,
    Authorization: `Bearer ${cfg.serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  return {
    from: (table: string) => new RestQueryBuilder(baseUrl, table, headers),
  };
}
