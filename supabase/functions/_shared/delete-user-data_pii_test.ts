// Test A: Assert that email never appears in console logs during deletion
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { deleteUserData } from "./delete-user-data.ts";
import { createMockSupabase } from "./test-utils.ts";

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

  const mockSupabase = createMockSupabase({});

  captureConsole();
  
  const result = await deleteUserData({
    userId: testUserId,
    userEmail: testEmail,
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });
  
  restoreConsole();

  assertEquals(result.success, true);
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (storage failure)", async () => {
  const testEmail = "test-pii-failure@example.com";
  const testUserId = "test-user-456";

  const mockSupabase = createMockSupabase({
    storageErrors: {
      "room-photos": { list: { message: "Storage list error" } },
    },
  });

  captureConsole();
  
  const result = await deleteUserData({
    userId: testUserId,
    userEmail: testEmail,
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });
  
  restoreConsole();

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "storage");
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (database failure)", async () => {
  const testEmail = "test-pii-db-fail@example.com";
  const testUserId = "test-user-789";

  const mockSupabase = createMockSupabase({
    dbErrors: {
      xp_events: { message: "DB error" },
    },
  });

  captureConsole();
  
  const result = await deleteUserData({
    userId: testUserId,
    userEmail: testEmail,
    userAppMetadata: {},
    userIdentities: [],
    supabase: mockSupabase,
  });
  
  restoreConsole();

  assertEquals(result.success, false);
  if (result.success) throw new Error("Result should be failure");
  assertEquals(result.stage, "database");
  assertNoEmail(logOutput, testEmail);
});

Deno.test("deleteUserData - email never appears in console logs (Apple revoke paths)", async () => {
  const testEmail = "test-apple@example.com";
  const testUserId = "test-user-apple";

  const mockSupabase = createMockSupabase({});

  captureConsole();
  
  const result = await deleteUserData({
    userId: testUserId,
    userEmail: testEmail,
    userAppMetadata: { 
      provider: "apple",
      provider_id: "001234.test"
    },
    userIdentities: [],
    supabase: mockSupabase,
  });
  
  restoreConsole();

  assertEquals(result.success, true);
  assertNoEmail(logOutput, testEmail);
});
