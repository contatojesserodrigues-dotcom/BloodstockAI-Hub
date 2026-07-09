declare module "@supabase/supabase-js" {
  export interface SupabaseResult<T> {
    data: T | null;
    error: { message: string } | null;
    count?: number | null;
  }

  export interface SupabaseClient {
    from(table: string): SupabaseQueryBuilder;
    channel(name: string): SupabaseChannel;
    removeChannel(channel: unknown): void;
  }

  export interface SupabaseQueryBuilder {
    select(columns?: string, options?: Record<string, unknown>): SupabaseQueryBuilder;
    insert(values: unknown): SupabaseQueryBuilder;
    update(values: unknown): SupabaseQueryBuilder;
    upsert(values: unknown): SupabaseQueryBuilder;
    delete(): SupabaseQueryBuilder;
    eq(column: string, value: unknown): SupabaseQueryBuilder;
    order(column: string, options?: Record<string, unknown>): SupabaseQueryBuilder;
    limit(count: number): SupabaseQueryBuilder;
    single(): Promise<SupabaseResult<Record<string, unknown>>>;
    then<TResult1 = SupabaseResult<Record<string, unknown>[]>, TResult2 = never>(
      onfulfilled?: ((value: SupabaseResult<Record<string, unknown>[]>) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2>;
  }

  export interface SupabaseChannel {
    on(
      event: string,
      filter: Record<string, unknown>,
      callback: (payload: { new: Record<string, unknown> }) => void
    ): SupabaseChannel;
    subscribe(): unknown;
  }

  export function createClient(
    url: string,
    key: string,
    options?: Record<string, unknown>
  ): SupabaseClient;
}
