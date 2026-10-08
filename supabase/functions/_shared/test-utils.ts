// Shared test utilities for Supabase function tests

export interface MockSupabaseOptions {
  storageErrors?: {
    [bucket: string]: {
      list?: { message: string };
      remove?: { message: string };
    };
  };
  dbErrors?: {
    [table: string]: { message: string };
  };
  authErrors?: {
    getUserById?: { message: string };
    deleteUser?: { message: string };
  };
  dbData?: {
    [table: string]: any[];
  };
}

export function createMockSupabase(options: MockSupabaseOptions = {}) {
  const updates: Array<{ table: string; data: any; id: string }> = [];
  const inserts: Array<{ table: string; data: any }> = [];
  const deletes: Array<{ table: string; id: string }> = [];

  return {
    _testData: { updates, inserts, deletes },
    storage: {
      listBuckets: async () => ({
        data: [
          { id: "room-photos", name: "room-photos" },
          { id: "public-designs", name: "public-designs" },
          { id: "profile-photos", name: "profile-photos" },
        ],
        error: null,
      }),
      from: (bucket: string) => ({
        list: async (prefix: string) => {
          const error = options.storageErrors?.[bucket]?.list;
          if (error) return { data: null, error };
          return { data: [], error: null };
        },
        remove: async (paths: string[]) => {
          const error = options.storageErrors?.[bucket]?.remove;
          if (error) return { data: null, error };
          return { data: null, error: null };
        },
      }),
    },
    from: (table: string) => ({
      select: (columns?: string) => ({
        eq: (col: string, val: any) => ({
          order: (col: string, opts?: any) => ({
            limit: (n: number) => Promise.resolve({
              data: options.dbData?.[table] || [],
              error: null,
            }),
          }),
          data: options.dbData?.[table] || [],
          error: null,
        }),
        lte: (col: string, val: any) => ({
          in: (col: string, vals: any[]) => Promise.resolve({
            data: options.dbData?.[table] || [],
            error: null,
          }),
        }),
      }),
      insert: (data: any) => {
        inserts.push({ table, data });
        return Promise.resolve({ data: null, error: null });
      },
      update: (data: any) => ({
        eq: (col: string, val: any) => {
          updates.push({ table, data, id: val });
          return Promise.resolve({ data: null, error: null });
        },
      }),
      delete: () => ({
        eq: (col: string, val: any) => {
          deletes.push({ table, id: val });
          const error = options.dbErrors?.[table];
          if (error) return Promise.resolve({ error });
          return Promise.resolve({ error: null });
        },
      }),
    }),
    auth: {
      admin: {
        getUserById: async (userId: string) => {
          const error = options.authErrors?.getUserById;
          if (error) return { data: { user: null }, error };
          if (userId === "deleted-user") {
            return { data: { user: null }, error: { message: "User not found" } };
          }
          return {
            data: {
              user: {
                id: userId,
                email: `${userId}@test.com`,
                app_metadata: {},
                identities: [],
              },
            },
            error: null,
          };
        },
        deleteUser: async (userId: string) => {
          const error = options.authErrors?.deleteUser;
          if (error) return { error };
          return { error: null };
        },
      },
    },
  };
}
