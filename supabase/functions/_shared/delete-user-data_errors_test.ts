// Test B: Storage/DB errors return correct stage and don't delete auth user
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { deleteUserData } from "./delete-user-data.ts";
import { createMockSupabase } from "./test-utils.ts";

Deno.test("deleteUserData - storage list error returns stage 'storage' and doesn't delete auth", async () => {
  const testUserId = "test-storage-list-fail";
  let authDeleteCalled = false;

  const mockSupabase = createMockSupabase({
    storageErrors: {
      "room-photos": { list: { message: "List failed" } },
    },
    authErrors: {
      deleteUser: { message: "should not be called" },
    },
  });

  // Spy on deleteUser
  const originalDeleteUser = mockSupabase.auth.admin.deleteUser;
  mockSupabase.auth.admin.deleteUser = async (userId: string) => {
    authDeleteCalled = true;
    return await originalDeleteUser(userId);
  };

  const result = await deleteUserData({
    userId: testUserId,
    userEmail: "test@example.com",
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:list_failed");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on storage error");
});

Deno.test("deleteUserData - storage remove error returns stage 'storage' and doesn't delete auth", async () => {
  const testUserId = "test-storage-remove-fail";
  let authDeleteCalled = false;

  const mockSupabase = createMockSupabase({
    storageErrors: {
      "room-photos": { remove: { message: "Remove failed" } },
    },
  });

  // Override list to return files
  const originalFrom = mockSupabase.storage.from;
  (mockSupabase.storage as any).from = (bucket: string) => {
    const bucketMethods = originalFrom(bucket);
    return {
      ...bucketMethods,
      list: async (prefix: string) => ({
        data: [{ name: "file1.jpg" }, { name: "file2.jpg" }],
        error: null,
      }),
    };
  };

  // Spy on deleteUser
  const originalDeleteUser = mockSupabase.auth.admin.deleteUser;
  mockSupabase.auth.admin.deleteUser = async (userId: string) => {
    authDeleteCalled = true;
    return await originalDeleteUser(userId);
  };

  const result = await deleteUserData({
    userId: testUserId,
    userEmail: "test@example.com",
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:remove_failed");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on storage error");
});

Deno.test("deleteUserData - DB error returns stage 'database' with table name and doesn't delete auth", async () => {
  const testUserId = "test-db-fail";
  let authDeleteCalled = false;

  const mockSupabase = createMockSupabase({
    dbErrors: {
      leads: { message: "FK violation" },
    },
  });

  // Spy on deleteUser
  const originalDeleteUser = mockSupabase.auth.admin.deleteUser;
  mockSupabase.auth.admin.deleteUser = async (userId: string) => {
    authDeleteCalled = true;
    return await originalDeleteUser(userId);
  };

  const result = await deleteUserData({
    userId: testUserId,
    userEmail: "test@example.com",
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "database");
  assertEquals(result.error, "database:leads");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted on DB error");
});

Deno.test("deleteUserData - remove that keeps returning same files hits max attempts", async () => {
  const testUserId = "test-infinite-loop";
  let authDeleteCalled = false;
  let listCallCount = 0;
  let removeCallCount = 0;

  const mockSupabase = createMockSupabase({});

  // Override storage to always return files to trigger max attempts in the deletion loop
  // The key is that list ALWAYS returns the same files, simulating a scenario where
  // files can't be deleted (e.g., permission issue, S3 eventual consistency, etc.)
  (mockSupabase.storage as any).from = function(bucket: string) {
    return {
      list: async (prefix: string, options?: any) => {
        listCallCount++;
        // Return exactly 1000 files (the page size) so the loop doesn't exit early
        // and continues until hitting maxAttempts (100 iterations)
        const files = [];
        for (let i = 0; i < 1000; i++) {
          files.push({ name: `stuck${i}.jpg`, id: `file-${i}` });
        }
        return {
          data: files,
          error: null,
        };
      },
      remove: async (paths: string[]) => {
        removeCallCount++;
        // Remove "succeeds" but files reappear on next list
        return { data: null, error: null };
      },
    };
  };

  // Spy on deleteUser
  const originalDeleteUser = mockSupabase.auth.admin.deleteUser;
  mockSupabase.auth.admin.deleteUser = async (userId: string) => {
    authDeleteCalled = true;
    return await originalDeleteUser(userId);
  };

  const result = await deleteUserData({
    userId: testUserId,
    userEmail: "test@example.com",
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "storage");
  assertEquals(result.error, "storage:max_attempts_exceeded");
  assertEquals(authDeleteCalled, false, "Auth user should NOT be deleted when stuck in loop");
  // The loop should hit max attempts (100) before throwing
  assertEquals(listCallCount >= 100, true, `Should hit max list attempts (100), got ${listCallCount}`);
  assertEquals(removeCallCount >= 100, true, `Should hit max remove attempts (100), got ${removeCallCount}`);
});
