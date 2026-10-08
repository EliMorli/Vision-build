// Test B: Storage/DB errors return correct stage and don't delete auth user
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { deleteUserData } from "./delete-user-data.ts";

Deno.test("deleteUserData - storage list error returns stage 'storage' and doesn't delete auth", async () => {
  const testUserId = "test-storage-list-fail";
  let authDeleteCalled = false;

  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: "test@example.com", app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => {
          authDeleteCalled = true;
          return { error: null };
        },
      },
    },
    from: () => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    storage: {
      listBuckets: async () => ({
        data: [{ id: "profiles", name: "profiles" }],
        error: null,
      }),
      from: () => ({
        list: async () => ({ data: null, error: { message: "List failed" } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;

  const result = await deleteUserData(testUserId, mockSupabase);

  assertEquals(result.success, false);
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:list_failed");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on storage error");
});

Deno.test("deleteUserData - storage remove error returns stage 'storage' and doesn't delete auth", async () => {
  const testUserId = "test-storage-remove-fail";
  let authDeleteCalled = false;

  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: "test@example.com", app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => {
          authDeleteCalled = true;
          return { error: null };
        },
      },
    },
    from: () => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    storage: {
      listBuckets: async () => ({
        data: [{ id: "profiles", name: "profiles" }],
        error: null,
      }),
      from: () => ({
        list: async () => ({ 
          data: [{ name: "file1.jpg" }, { name: "file2.jpg" }], 
          error: null 
        }),
        remove: async () => ({ 
          data: null, 
          error: { message: "Remove failed" } 
        }),
      }),
    },
  } as any;

  const result = await deleteUserData(testUserId, mockSupabase);

  assertEquals(result.success, false);
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:remove_failed");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on storage error");
});

Deno.test("deleteUserData - DB error returns stage 'database' with table name and doesn't delete auth", async () => {
  const testUserId = "test-db-fail";
  let authDeleteCalled = false;

  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: "test@example.com", app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => {
          authDeleteCalled = true;
          return { error: null };
        },
      },
    },
    from: (table: string) => {
      if (table === "xp_events") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        };
      }
      // Fail on leads table
      if (table === "leads") {
        return {
          delete: () => ({
            eq: () => Promise.resolve({ error: { message: "FK violation" } }),
          }),
        };
      }
      return {
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
    storage: {
      listBuckets: async () => ({ data: [], error: null }),
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;

  const result = await deleteUserData(testUserId, mockSupabase);

  assertEquals(result.success, false);
  assertEquals(result.stage, "database");
  assertEquals(result.error, "database:leads");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on DB error");
});

Deno.test("deleteUserData - remove that keeps returning same files hits max attempts", async () => {
  const testUserId = "test-infinite-loop";
  let authDeleteCalled = false;
  let removeCallCount = 0;

  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: "test@example.com", app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => {
          authDeleteCalled = true;
          return { error: null };
        },
      },
    },
    from: () => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    storage: {
      listBuckets: async () => ({
        data: [{ id: "profiles", name: "profiles" }],
        error: null,
      }),
      from: () => ({
        // Always return the same files
        list: async () => ({ 
          data: [
            { name: "stuck1.jpg" }, 
            { name: "stuck2.jpg" }
          ], 
          error: null 
        }),
        // Remove "succeeds" but files reappear
        remove: async () => {
          removeCallCount++;
          return { data: null, error: null };
        },
      }),
    },
  } as any;

  const result = await deleteUserData(testUserId, mockSupabase);

  assertEquals(result.success, false);
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:max_attempts_exceeded");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted when stuck in loop");
  // Should hit the cap (currently 10 in the code)
  assertEquals(removeCallCount >= 10, true, "Should hit max attempts cap");
});
