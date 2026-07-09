/** Minimal stub — replaced when `npm install` fetches the real @supabase/supabase-js package. */

function chain() {
  const result = {
    data: null,
    error: { message: "Supabase package not installed" },
    count: 0,
  };
  const builder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    upsert: () => builder,
    delete: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: async () => result,
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function createClient() {
  return {
    from: () => chain(),
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: () => {},
  };
}

module.exports = { createClient };
