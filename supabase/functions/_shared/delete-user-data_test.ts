// Tests for delete-user-data module (Apple revocation logic)

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { deleteUserData, DeleteUserDataParams, AppleRevokeStatus } from "./delete-user-data.ts";

// Mock Supabase client
function createMockSupabase(opts: {
  storageFiles?: any[];
  projects?: any[];
  deleteUserError?: any;
  appleTokenExchangeStatus?: number;
  appleRevokeStatus?: number;
}) {
  return {
    storage: {
      from: (bucket: string) => ({
        list: async (prefix: string) => {
          return { data: opts.storageFiles || [], error: null };
        },
        remove: async (paths: string[]) => {
          return { error: null };
        },
      }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          data: opts.projects || [],
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
    auth: {
      admin: {
        deleteUser: async (userId: string) => {
          return { error: opts.deleteUserError || null };
        },
      },
    },
  };
}

// Mock fetch for Apple API calls
let mockFetchResponses: Array<{ status: number; body: any }> = [];
let fetchCallCount = 0;

const originalFetch = globalThis.fetch;

function setupMockFetch(responses: Array<{ status: number; body: any }>) {
  mockFetchResponses = responses;
  fetchCallCount = 0;
  
  globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const response = mockFetchResponses[fetchCallCount++];
    return new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("deleteUserData - not an Apple user", async () => {
  const supabase = createMockSupabase({});
  
  const result = await deleteUserData({
    userId: "user-123",
    userEmail: "test@example.com",
    userAppMetadata: { provider: "google" },
    userIdentities: [],
    supabase,
  });

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.appleRevokeStatus, { status: "skipped", reason: "not_apple_user" });
  }
});

Deno.test("deleteUserData - Apple user with no auth code (user cancelled)", async () => {
  const supabase = createMockSupabase({});
  
  const result = await deleteUserData({
    userId: "user-123",
    userEmail: "test@example.com",
    userAppMetadata: { provider: "apple" },
    userIdentities: [],
    supabase,
  });

  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.appleRevokeStatus, { status: "skipped", reason: "no_auth_code" });
  }
});

Deno.test("deleteUserData - Apple user with missing credentials", async () => {
  // Save original env vars
  const originalTeamId = Deno.env.get("APPLE_TEAM_ID");
  const originalKeyId = Deno.env.get("APPLE_KEY_ID");
  const originalPrivateKey = Deno.env.get("APPLE_PRIVATE_KEY");
  const originalServicesId = Deno.env.get("APPLE_SERVICES_ID");
  
  // Clear env vars
  Deno.env.delete("APPLE_TEAM_ID");
  Deno.env.delete("APPLE_KEY_ID");
  Deno.env.delete("APPLE_PRIVATE_KEY");
  Deno.env.delete("APPLE_SERVICES_ID");
  
  try {
    const supabase = createMockSupabase({});
    
    const result = await deleteUserData({
      userId: "user-123",
      userEmail: "test@example.com",
      userAppMetadata: { provider: "apple" },
      userIdentities: [],
      supabase,
      appleAuthCode: "auth-code-123",
    });

    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.appleRevokeStatus, { status: "skipped", reason: "missing_credentials" });
    }
  } finally {
    // Restore env vars
    if (originalTeamId) Deno.env.set("APPLE_TEAM_ID", originalTeamId);
    if (originalKeyId) Deno.env.set("APPLE_KEY_ID", originalKeyId);
    if (originalPrivateKey) Deno.env.set("APPLE_PRIVATE_KEY", originalPrivateKey);
    if (originalServicesId) Deno.env.set("APPLE_SERVICES_ID", originalServicesId);
  }
});

Deno.test("deleteUserData - Apple token exchange fails", async () => {
  // Set up env vars
  Deno.env.set("APPLE_TEAM_ID", "TEST_TEAM");
  Deno.env.set("APPLE_KEY_ID", "TEST_KEY");
  Deno.env.set("APPLE_SERVICES_ID", "com.test.service");
  
  // Generate a valid ES256 private key for testing
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  Deno.env.set("APPLE_PRIVATE_KEY", privateKeyBase64);
  
  setupMockFetch([
    { status: 400, body: { error: "invalid_grant" } }, // Token exchange fails
  ]);
  
  try {
    const supabase = createMockSupabase({});
    
    const result = await deleteUserData({
      userId: "user-123",
      userEmail: "test@example.com",
      userAppMetadata: { provider: "apple" },
      userIdentities: [],
      supabase,
      appleAuthCode: "invalid-code",
    });

    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.appleRevokeStatus.status, "failed");
      if (result.appleRevokeStatus.status === 'failed') {
        assertEquals(result.appleRevokeStatus.reason, "token_exchange_failed");
      }
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("deleteUserData - Apple revoke fails but deletion succeeds", async () => {
  Deno.env.set("APPLE_TEAM_ID", "TEST_TEAM");
  Deno.env.set("APPLE_KEY_ID", "TEST_KEY");
  Deno.env.set("APPLE_SERVICES_ID", "com.test.service");
  
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  Deno.env.set("APPLE_PRIVATE_KEY", privateKeyBase64);
  
  setupMockFetch([
    { status: 200, body: { refresh_token: "refresh-token-123" } }, // Token exchange succeeds
    { status: 400, body: { error: "invalid_token" } }, // Revoke fails
  ]);
  
  try {
    const supabase = createMockSupabase({});
    
    const result = await deleteUserData({
      userId: "user-123",
      userEmail: "test@example.com",
      userAppMetadata: { provider: "apple" },
      userIdentities: [],
      supabase,
      appleAuthCode: "valid-code",
    });

    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.appleRevokeStatus.status, "failed");
      if (result.appleRevokeStatus.status === 'failed') {
        assertEquals(result.appleRevokeStatus.reason, "revoke_failed");
      }
    }
  } finally {
    restoreFetch();
  }
});

Deno.test("deleteUserData - Apple revoke succeeds", async () => {
  Deno.env.set("APPLE_TEAM_ID", "TEST_TEAM");
  Deno.env.set("APPLE_KEY_ID", "TEST_KEY");
  Deno.env.set("APPLE_SERVICES_ID", "com.test.service");
  
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  Deno.env.set("APPLE_PRIVATE_KEY", privateKeyBase64);
  
  setupMockFetch([
    { status: 200, body: { refresh_token: "refresh-token-123" } }, // Token exchange succeeds
    { status: 200, body: {} }, // Revoke succeeds
  ]);
  
  try {
    const supabase = createMockSupabase({});
    
    const result = await deleteUserData({
      userId: "user-123",
      userEmail: "test@example.com",
      userAppMetadata: { provider: "apple" },
      userIdentities: [],
      supabase,
      appleAuthCode: "valid-code",
    });

    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.appleRevokeStatus, { status: "success" });
    }
  } finally {
    restoreFetch();
  }
});
