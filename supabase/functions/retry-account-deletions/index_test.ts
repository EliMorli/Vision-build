// Test C: retry-account-deletions comprehensive tests
import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { handleRetry, type RetryRequest, type RetryDeps } from "./index.ts";

// Mock clock for time-based tests
class MockClock {
  private currentTime: Date;

  constructor(initialTime: Date) {
    this.currentTime = initialTime;
  }

  now(): Date {
    return this.currentTime;
  }

  advance(ms: number) {
    this.currentTime = new Date(this.currentTime.getTime() + ms);
  }
}

// Mock Supabase client
function createMockSupabase() {
  const updates: Array<{ table: string; data: any; id: string }> = [];
  const inserts: Array<{ table: string; data: any }> = [];
  
  return {
    updates,
    inserts,
    auth: {
      admin: {
        getUserById: async (userId: string) => {
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
      },
    },
    from: (table: string) => ({
      update: (data: any) => ({
        eq: (col: string, val: any) => {
          updates.push({ table, data, id: val });
          return Promise.resolve({ error: null });
        },
      }),
      insert: (data: any) => {
        inserts.push({ table, data });
        return Promise.resolve({ error: null });
      },
    }),
  };
}

Deno.test("retry-account-deletions - backoff schedule (15m, 1h, 6h, 24h, daily)", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();
  let deleteCallCount = 0;

  const requests: RetryRequest[] = [
    {
      id: "req-0",
      user_id: "user-0",
      email: "test0@test.com",
      retry_attempts: 0,
      next_retry_at: "2026-10-08T10:00:00Z",
      last_error_code: null,
      first_failed_at: null,
      alerted_at: null,
      status: "failed_pending_retry",
    },
    {
      id: "req-1",
      user_id: "user-1",
      email: "test1@test.com",
      retry_attempts: 1,
      next_retry_at: "2026-10-08T10:00:00Z",
      last_error_code: "storage:test",
      first_failed_at: "2026-10-08T09:00:00Z",
      alerted_at: null,
      status: "failed_pending_retry",
    },
    {
      id: "req-2",
      user_id: "user-2",
      email: "test2@test.com",
      retry_attempts: 2,
      next_retry_at: "2026-10-08T10:00:00Z",
      last_error_code: "storage:test",
      first_failed_at: "2026-10-08T09:00:00Z",
      alerted_at: null,
      status: "failed_pending_retry",
    },
    {
      id: "req-3",
      user_id: "user-3",
      email: "test3@test.com",
      retry_attempts: 3,
      next_retry_at: "2026-10-08T10:00:00Z",
      last_error_code: "storage:test",
      first_failed_at: "2026-10-08T09:00:00Z",
      alerted_at: null,
      status: "failed_pending_retry",
    },
    {
      id: "req-4",
      user_id: "user-4",
      email: "test4@test.com",
      retry_attempts: 4,
      next_retry_at: "2026-10-08T10:00:00Z",
      last_error_code: "storage:test",
      first_failed_at: "2026-10-08T09:00:00Z",
      alerted_at: null,
      status: "failed_pending_retry",
    },
  ];

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => {
      deleteCallCount++;
      return { success: false, stage: "storage" as const, error: "storage:test" };
    },
    sendAlert: async () => {},
    env: {},
  };

  await handleRetry(requests, deps);

  // Check backoff delays
  const attempt0 = mockSupabase.updates.find(u => u.id === "req-0");
  const attempt1 = mockSupabase.updates.find(u => u.id === "req-1");
  const attempt2 = mockSupabase.updates.find(u => u.id === "req-2");
  const attempt3 = mockSupabase.updates.find(u => u.id === "req-3");
  const attempt4 = mockSupabase.updates.find(u => u.id === "req-4");

  assertEquals(attempt0?.data.retry_attempts, 1, "Attempt 0 → 1");
  assertEquals(new Date(attempt0?.data.next_retry_at).getTime() - clock.now().getTime(), 15 * 60 * 1000, "15 minutes");

  assertEquals(attempt1?.data.retry_attempts, 2, "Attempt 1 → 2");
  assertEquals(new Date(attempt1?.data.next_retry_at).getTime() - clock.now().getTime(), 60 * 60 * 1000, "1 hour");

  assertEquals(attempt2?.data.retry_attempts, 3, "Attempt 2 → 3");
  assertEquals(new Date(attempt2?.data.next_retry_at).getTime() - clock.now().getTime(), 6 * 60 * 60 * 1000, "6 hours");

  assertEquals(attempt3?.data.retry_attempts, 4, "Attempt 3 → 4");
  assertEquals(new Date(attempt3?.data.next_retry_at).getTime() - clock.now().getTime(), 24 * 60 * 60 * 1000, "24 hours");

  assertEquals(attempt4?.data.retry_attempts, 5, "Attempt 4 → 5");
  assertEquals(new Date(attempt4?.data.next_retry_at).getTime() - clock.now().getTime(), 24 * 60 * 60 * 1000, "Daily after 4th");
});

Deno.test("retry-account-deletions - single alert at attempt 5", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();
  let alertCalls = 0;

  const request: RetryRequest = {
    id: "req-alert-5",
    user_id: "user-alert",
    email: "test@test.com",
    retry_attempts: 4,
    next_retry_at: "2026-10-08T10:00:00Z",
    last_error_code: "storage:test",
    first_failed_at: "2026-10-08T09:00:00Z",
    alerted_at: null,
    status: "failed_pending_retry",
  };

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => ({ success: false, stage: "storage" as const, error: "storage:test" }),
    sendAlert: async () => { alertCalls++; },
    env: {},
  };

  await handleRetry([request], deps);

  assertEquals(alertCalls, 1, "Should alert once at attempt 5");
  
  const alertUpdate = mockSupabase.updates.find(u => u.data.alerted_at);
  assertEquals(!!alertUpdate, true, "Should set alerted_at");
});

Deno.test("retry-account-deletions - single alert after 7 days", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();
  let alertCalls = 0;

  const request: RetryRequest = {
    id: "req-alert-7d",
    user_id: "user-7d",
    email: "test@test.com",
    retry_attempts: 2,
    next_retry_at: "2026-10-08T10:00:00Z",
    last_error_code: "storage:test",
    first_failed_at: "2026-09-30T10:00:00Z", // 8 days ago
    alerted_at: null,
    status: "failed_pending_retry",
  };

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => ({ success: false, stage: "storage" as const, error: "storage:test" }),
    sendAlert: async () => { alertCalls++; },
    env: {},
  };

  await handleRetry([request], deps);

  assertEquals(alertCalls, 1, "Should alert once after 7 days");
  
  const alertUpdate = mockSupabase.updates.find(u => u.data.alerted_at);
  assertEquals(!!alertUpdate, true, "Should set alerted_at");
});

Deno.test("retry-account-deletions - no duplicate alerts", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();
  let alertCalls = 0;

  const request: RetryRequest = {
    id: "req-no-dup",
    user_id: "user-no-dup",
    email: "test@test.com",
    retry_attempts: 5,
    next_retry_at: "2026-10-08T10:00:00Z",
    last_error_code: "storage:test",
    first_failed_at: "2026-09-30T10:00:00Z",
    alerted_at: "2026-10-01T10:00:00Z", // Already alerted
    status: "failed_pending_retry",
  };

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => ({ success: false, stage: "storage" as const, error: "storage:test" }),
    sendAlert: async () => { alertCalls++; },
    env: {},
  };

  await handleRetry([request], deps);

  assertEquals(alertCalls, 0, "Should not alert again");
});

Deno.test("retry-account-deletions - completion recorded in deletion_completion_log", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();

  const request: RetryRequest = {
    id: "req-success",
    user_id: "user-success",
    email: "test@test.com",
    retry_attempts: 2,
    next_retry_at: "2026-10-08T10:00:00Z",
    last_error_code: "storage:test",
    first_failed_at: "2026-10-08T09:00:00Z",
    alerted_at: null,
    status: "failed_pending_retry",
  };

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => ({ success: true, appleRevokeStatus: { status: "not_applicable" as const } }),
    sendAlert: async () => {},
    env: {},
  };

  const result = await handleRetry([request], deps);

  assertEquals(result.succeeded, 1, "Should succeed");
  assertEquals(result.failed, 0, "Should not fail");
  
  const completionLog = mockSupabase.inserts.find(i => i.table === "deletion_completion_log");
  assertEquals(!!completionLog, true, "Should insert into deletion_completion_log");
  assertEquals(completionLog?.data.user_id, "user-success");
  assertEquals(completionLog?.data.request_id, "req-success");
  assertEquals(completionLog?.data.retry_attempts, 3, "Should record 3 attempts (0 + 2 retries + 1)");
});

Deno.test("retry-account-deletions - marks deleted user as completed", async () => {
  const clock = new MockClock(new Date("2026-10-08T10:00:00Z"));
  const mockSupabase = createMockSupabase();

  const request: RetryRequest = {
    id: "req-deleted",
    user_id: "deleted-user",
    email: "deleted@test.com",
    retry_attempts: 1,
    next_retry_at: "2026-10-08T10:00:00Z",
    last_error_code: "auth:test",
    first_failed_at: "2026-10-08T09:00:00Z",
    alerted_at: null,
    status: "failed_pending_retry",
  };

  const deps: RetryDeps = {
    supabase: mockSupabase,
    clock,
    deleteUser: async () => ({ success: false, stage: "auth" as const, error: "should_not_call" }),
    sendAlert: async () => {},
    env: {},
  };

  const result = await handleRetry([request], deps);

  assertEquals(result.succeeded, 1, "Should mark as succeeded");
  
  const completedUpdate = mockSupabase.updates.find(u => u.id === "req-deleted");
  assertEquals(completedUpdate?.data.status, "completed");
  assertEquals(!!completedUpdate?.data.completed_at, true);
});
