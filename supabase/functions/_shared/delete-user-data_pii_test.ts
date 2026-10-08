// Test A: Assert that email never appears in console logs during deletion
import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { deleteUserData } from "./delete-user-data.ts";

// Mock console to capture all output
let logOutput: string[] = [];
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function captureConsole() {
  logOutput = [];
  console.log = (...args: any[]) => {
    logOutput.push(args.join(" "));
    originalLog(...args);
  };
  console.warn = (...args: any[]) => {
    logOutput.push(args.join(" "));
    originalWarn(...args);
  };
  console.error = (...args: any[]) => {
    logOutput.push(args.join(" "));
    originalError(...args);
  };
}

function restoreConsole() {
  console.log = originalLog;
  console.warn = originalWarn;
  console.error = originalError;
}

function assertNoEmail(logs: string[], email: string) {
  for (const log of logs) {
    if (log.includes(email)) {
      throw new Error(`Email ${email} found in logs: ${log}`);
    }
  }
}

Deno.test("deleteUserData - email never appears in console logs (success path)", async () => {
  const testEmail = "test-pii@example.com";
  const testUserId = "test-user-123";

  // Mock Supabase client
  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: testEmail, app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => ({ error: null }),
      },
    },
    from: (table: string) => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
    storage: {
      listBuckets: async () => ({
        data: [{ id: "profiles", name: "profiles" }, { id: "projects", name: "projects" }],
        error: null,
      }),
      from: (bucket: string) => ({
        list: async (path: string) => ({ data: [], error: null }),
        remove: async (paths: string[]) => ({ data: null, error: null }),
      }),
    },
  } as any;

  captureConsole();
  
  const result = await deleteUserData(testUserId, mockSupabase);
  
  restoreConsole();

  assertEquals(result.success, true);
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (storage failure)", async () => {
  const testEmail = "test-pii-failure@example.com";
  const testUserId = "test-user-456";

  // Mock with storage error
  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: testEmail, app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => ({ error: null }),
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
        list: async () => ({ data: null, error: { message: "Storage list error" } }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;

  captureConsole();
  
  const result = await deleteUserData(testUserId, mockSupabase);
  
  restoreConsole();

  assertEquals(result.success, false);
  assertEquals(result.stage, "storage");
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (database failure)", async () => {
  const testEmail = "test-pii-db-fail@example.com";
  const testUserId = "test-user-789";

  // Mock with DB error
  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { user: { id: testUserId, email: testEmail, app_metadata: {} } },
          error: null,
        }),
        deleteUser: async () => ({ error: null }),
      },
    },
    from: (table: string) => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: { message: "DB error" } }),
      }),
    }),
    storage: {
      listBuckets: async () => ({
        data: [],
        error: null,
      }),
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;

  captureConsole();
  
  const result = await deleteUserData(testUserId, mockSupabase);
  
  restoreConsole();

  assertEquals(result.success, false);
  assertEquals(result.stage, "database");
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (Apple revoke paths)", async () => {
  const testEmail = "test-apple@example.com";
  const testUserId = "test-user-apple";

  // Mock Apple user
  const mockSupabase = {
    auth: {
      admin: {
        getUserById: async () => ({
          data: { 
            user: { 
              id: testUserId, 
              email: testEmail, 
              app_metadata: { 
                provider: "apple",
                provider_id: "001234.test"
              } 
            } 
          },
          error: null,
        }),
        deleteUser: async () => ({ error: null }),
      },
    },
    from: (table: string) => ({
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
      insert: () => Promise.resolve({ error: null }),
    }),
    storage: {
      listBuckets: async () => ({ data: [], error: null }),
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
      }),
    },
  } as any;

  captureConsole();
  
  // Will attempt Apple revocation (likely fails in test, but shouldn't log email)
  const result = await deleteUserData(testUserId, mockSupabase);
  
  restoreConsole();

  assertEquals(result.success, true);
  assertNoEmail(logOutput, testEmail);
  // Should see Apple-related logs but never the email
  const hasAppleLog = logOutput.some(log => log.includes("Apple") || log.includes("revoke"));
  // Apple path may or may not log depending on env vars, but email must not appear
});
