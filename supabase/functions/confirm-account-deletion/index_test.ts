import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { handleConfirmGet, handleConfirmPost, maskEmail, ConfirmDeletionDeps } from "./index.ts";
import { createMockSupabase } from "../_shared/test-utils.ts";

// Helper to create fake deps
function createFakeDeps(overrides: Partial<ConfirmDeletionDeps> = {}): ConfirmDeletionDeps {
  const deletionRequests = new Map<string, any>();
  const deletedUsers: string[] = [];
  const inserts: any[] = [];
  
  const mockSupabase = createMockSupabase({});
  
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: any) => ({
            single: () => {
              const request = deletionRequests.get(`${table}:${val}`);
              return request ? { data: request, error: null } : { data: null, error: { message: "Not found" } };
            }
          })
        }),
        update: (data: any) => ({
          eq: (col: string, val: any) => {
            const key = `${table}:${val}`;
            const request = deletionRequests.get(key);
            if (request) {
              Object.assign(request, data);
              deletionRequests.set(key, request);
            }
            return Promise.resolve({ error: null });
          }
        }),
        insert: (data: any) => {
          inserts.push({ table, data });
          return Promise.resolve({ error: null });
        },
      }),
      rpc: (_name: string, params: any) => {
        // Mock user lookup
        const exists = params.user_email === "known@example.com";
        return { data: exists ? "user-123" : null, error: null };
      },
      auth: mockSupabase.auth,
    },
    clock: { now: () => new Date("2024-01-01T12:00:00Z") },
    deleteUser: async (params) => {
      deletedUsers.push(params.userId);
      return { 
        success: true, 
        appleRevokeStatus: { status: 'skipped', reason: 'not_apple_user' } 
      };
    },
    crypto: {
      sha256: async (data: Uint8Array) => {
        // Simple fake hash
        const hash = new Uint8Array(32);
        for (let i = 0; i < 32; i++) hash[i] = data[i % data.length];
        return hash;
      },
    },
    ...overrides,
  };
}

Deno.test("maskEmail: masks standard email", () => {
  assertEquals(maskEmail("john@example.com"), "j•••@example.com");
});

Deno.test("maskEmail: masks short local part", () => {
  assertEquals(maskEmail("ab@example.com"), "a•••@example.com");
});

Deno.test("maskEmail: masks single char local part", () => {
  assertEquals(maskEmail("a@example.com"), "a•••@example.com");
});

Deno.test("confirm GET: invalid token returns 400", async () => {
  const deps = createFakeDeps();
  
  const response = await handleConfirmGet("invalid", deps);
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.valid, false);
  assertEquals(body.error, "Invalid or missing confirmation token");
});

Deno.test("confirm GET: valid token renders confirm page", async () => {
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "test@example.com",
                status: "pending",
                expires_at: "2024-01-02T12:00:00Z",
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
  });
  
  // Valid 64-char token
  const token = "a".repeat(64);
  const response = await handleConfirmGet(token, deps);
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.valid, true);
  assertEquals(body.email, "t•••@example.com");
});

Deno.test("confirm GET: expired token returns error and marks as expired", async () => {
  let markedExpired = false;
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "test@example.com",
                status: "pending",
                expires_at: "2024-01-01T11:00:00Z", // Before clock.now
              },
              error: null,
            })
          })
        }),
        update: (data: any) => ({
          eq: () => {
            if (data.status === "expired") markedExpired = true;
            return Promise.resolve({ error: null });
          }
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmGet(token, deps);
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.valid, false);
  assertEquals(body.expired, true);
  assertEquals(markedExpired, true);
});

Deno.test("confirm GET: already used token returns error", async () => {
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "test@example.com",
                status: "completed",
                expires_at: "2024-01-02T12:00:00Z",
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmGet(token, deps);
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.valid, false);
  assertEquals(body.used, true);
});

Deno.test("confirm POST: valid token deletes user", async () => {
  const deletedUsers: string[] = [];
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "known@example.com",
                status: "pending",
                expires_at: "2024-01-02T12:00:00Z",
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: { app_metadata: {}, identities: [] } }, error: null }) } },
    },
    deleteUser: async (params) => {
      deletedUsers.push(params.userId);
      return { 
        success: true, 
        appleRevokeStatus: { status: 'skipped', reason: 'not_apple_user' } 
      };
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmPost(token, undefined, deps);
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(deletedUsers, ["user-123"]);
});

Deno.test("confirm POST: expired token does not delete", async () => {
  const deletedUsers: string[] = [];
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "known@example.com",
                status: "pending",
                expires_at: "2024-01-01T11:00:00Z", // Expired
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
    deleteUser: async (params) => {
      deletedUsers.push(params.userId);
      return { 
        success: true, 
        appleRevokeStatus: { status: 'skipped', reason: 'not_apple_user' } 
      };
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmPost(token, undefined, deps);
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(deletedUsers, []);
});

Deno.test("confirm POST: reused token does not delete twice", async () => {
  const deletedUsers: string[] = [];
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "known@example.com",
                status: "completed", // Already used
                expires_at: "2024-01-02T12:00:00Z",
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: "user-123", error: null }),
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
    deleteUser: async (params) => {
      deletedUsers.push(params.userId);
      return { 
        success: true, 
        appleRevokeStatus: { status: 'skipped', reason: 'not_apple_user' } 
      };
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmPost(token, undefined, deps);
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.used, true);
  assertEquals(deletedUsers, []);
});

Deno.test("confirm POST: unknown email completes without error", async () => {
  const deletedUsers: string[] = [];
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({
              data: {
                id: "req-123",
                email: "unknown@example.com",
                status: "pending",
                expires_at: "2024-01-02T12:00:00Z",
              },
              error: null,
            })
          })
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: () => Promise.resolve({ error: null }),
      }),
      rpc: () => ({ data: null, error: null }), // User not found
      auth: { admin: { getUserById: async () => ({ data: { user: {} }, error: null }) } },
    },
    deleteUser: async (params) => {
      deletedUsers.push(params.userId);
      return { 
        success: true, 
        appleRevokeStatus: { status: 'skipped', reason: 'not_apple_user' } 
      };
    },
  });
  
  const token = "a".repeat(64);
  const response = await handleConfirmPost(token, undefined, deps);
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(deletedUsers, [], "Should not attempt to delete non-existent user");
});
