import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { handleRequestDeletion, RequestDeletionDeps } from "./index.ts";

// Create fake dependencies for testing
function createFakeDeps(overrides: Partial<RequestDeletionDeps> = {}): RequestDeletionDeps {
  const deletionRequests: any[] = [];
  const logMessages: string[] = [];
  const errorMessages: string[] = [];
  
  return {
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            gte: () => ({ data: deletionRequests.filter(r => r.table === table) })
          })
        }),
        insert: (data: any) => {
          deletionRequests.push({ table, ...data });
          return { error: null };
        },
      }),
      rpc: (_name: string, params: any) => {
        // Mock user lookup
        const exists = params.user_email === "known@example.com";
        return { data: exists ? "user-123" : null };
      },
    },
    clock: { now: () => new Date("2024-01-01T12:00:00Z") },
    env: {
      resendApiKey: "test-key",
      appEnv: "production",
      baseUrl: "https://test.app",
    },
    emailSender: async () => ({ ok: true, status: 200, text: "success" }),
    logger: {
      log: (msg: string) => logMessages.push(msg),
      error: (msg: string, ...args: any[]) => errorMessages.push(`${msg} ${args.join(" ")}`),
    },
    crypto: {
      getRandomBytes: (length: number) => {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) bytes[i] = i % 256;
        return bytes;
      },
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

Deno.test("request-deletion: invalid email returns 400", async () => {
  const deps = createFakeDeps();
  
  const response = await handleRequestDeletion(
    { email: "not-an-email" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 400);
  const body = await response.json();
  assertEquals(body.error, "Invalid email address");
});

Deno.test("request-deletion: unknown email gets neutral response and no email sent", async () => {
  let emailSent = false;
  const deps = createFakeDeps({
    emailSender: async () => {
      emailSent = true;
      return { ok: true, status: 200, text: "success" };
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "unknown@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.message, "If an account exists for that email, we sent a confirmation link. Check your inbox.");
  assertEquals(emailSent, false, "No email should be sent for unknown user");
});

Deno.test("request-deletion: known email gets neutral response and email is sent", async () => {
  let emailSent = false;
  const deps = createFakeDeps({
    emailSender: async () => {
      emailSent = true;
      return { ok: true, status: 200, text: "success" };
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "known@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
  assertEquals(body.message, "If an account exists for that email, we sent a confirmation link. Check your inbox.");
  assertEquals(emailSent, true, "Email should be sent for known user");
});

Deno.test("request-deletion: rate limit by email returns neutral response", async () => {
  const deletionRequests = [
    { email: "test@example.com", created_at: "2024-01-01T11:00:00Z" },
    { email: "test@example.com", created_at: "2024-01-01T11:20:00Z" },
    { email: "test@example.com", created_at: "2024-01-01T11:40:00Z" },
  ];
  
  const deps = createFakeDeps({
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            gte: () => ({ data: deletionRequests })
          })
        }),
        insert: () => ({ error: null }),
      }),
      rpc: () => ({ data: "user-123" }),
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "test@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
});

Deno.test("request-deletion: rate limit by IP returns neutral response", async () => {
  const deletionRequests = Array(10).fill(null).map((_, i) => ({
    ip_address: "1.2.3.4",
    created_at: `2024-01-01T11:${String(i * 5).padStart(2, '0')}:00Z`,
  }));
  
  const deps = createFakeDeps({
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: (field: string) => ({
            gte: () => ({ 
              data: field === "ip_address" ? deletionRequests : [] 
            })
          })
        }),
        insert: () => ({ error: null }),
      }),
      rpc: () => ({ data: "user-123" }),
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "new@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  const body = await response.json();
  assertEquals(body.success, true);
});

Deno.test("request-deletion: token stored as hash only", async () => {
  let insertedData: any = null;
  const deps = createFakeDeps({
    supabase: {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            gte: () => ({ data: [] })
          })
        }),
        insert: (data: any) => {
          insertedData = data;
          return { error: null };
        },
      }),
      rpc: () => ({ data: "user-123" }),
    },
  });
  
  await handleRequestDeletion(
    { email: "known@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(insertedData !== null, true, "Should insert deletion request");
  assertEquals(insertedData.token_hash.length, 64, "Token hash should be 64 hex chars");
  assertEquals(insertedData.token_hash.includes("token="), false, "Should not contain plaintext token");
});

Deno.test("request-deletion: production without RESEND_API_KEY returns 500", async () => {
  const logMessages: string[] = [];
  const errorMessages: string[] = [];
  
  const deps = createFakeDeps({
    env: {
      resendApiKey: undefined,
      appEnv: "production",
      baseUrl: "https://test.app",
    },
    logger: {
      log: (msg: string) => logMessages.push(msg),
      error: (msg: string) => errorMessages.push(msg),
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "known@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Email service unavailable");
  
  // Token should never be logged in production
  const allLogs = [...logMessages, ...errorMessages].join("\n");
  assertEquals(allLogs.includes("token="), false, "Token should never appear in logs");
  assertEquals(allLogs.includes("/delete-account/confirm"), false, "Confirmation link should never appear in logs");
});

Deno.test("request-deletion: development without RESEND_API_KEY logs link", async () => {
  const logMessages: string[] = [];
  
  const deps = createFakeDeps({
    env: {
      resendApiKey: undefined,
      appEnv: "development",
      baseUrl: "https://test.app",
    },
    logger: {
      log: (msg: string) => logMessages.push(msg),
      error: () => {},
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "known@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  
  // In development, the link should be logged
  const allLogs = logMessages.join("\n");
  assertEquals(allLogs.includes("/delete-account/confirm?token="), true, "Link should be logged in dev");
});

Deno.test("request-deletion: staging without RESEND_API_KEY does NOT log link", async () => {
  const logMessages: string[] = [];
  
  const deps = createFakeDeps({
    env: {
      resendApiKey: undefined,
      appEnv: "staging",
      baseUrl: "https://test.app",
    },
    logger: {
      log: (msg: string) => logMessages.push(msg),
      error: () => {},
    },
  });
  
  const response = await handleRequestDeletion(
    { email: "known@example.com" },
    "1.2.3.4",
    deps
  );
  
  assertEquals(response.status, 200);
  
  // In staging, the link should NOT be logged
  const allLogs = logMessages.join("\n");
  assertEquals(allLogs.includes("/delete-account/confirm?token="), false, "Link should NOT be logged in staging");
});
