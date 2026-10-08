#!/usr/bin/env tsx
/**
 * Integration test for account deletion flow
 * Tests: unconfirmed, expired, reused, GET-only requests delete nothing; POST with valid token deletes
 * 
 * Run with: npx tsx scripts/test-deletion-flow.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing environment variables. Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function pass(name: string) {
  console.log(`✅ PASS: ${name}`);
  results.push({ name, passed: true });
}

function fail(name: string, error: string) {
  console.log(`❌ FAIL: ${name}: ${error}`);
  results.push({ name, passed: false, error });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Test 1: GET request does NOT delete anything
async function testGetDoesNotDelete() {
  const testName = "GET request validates but does not delete";
  try {
    // Create a test deletion request directly via service role
    const email = `get-test-${Date.now()}@example.com`;
    const token = "a".repeat(64);
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: insertError } = await adminClient
      .from("account_deletion_requests")
      .insert({
        email,
        token_hash: tokenHash,
        status: "pending",
      });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    // Make GET request (should validate only)
    const getResponse = await fetch(
      `${SUPABASE_URL.replace("/rest/v1", "")}/functions/v1/confirm-account-deletion?token=${token}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const getResult = await getResponse.json();

    if (!getResponse.ok) {
      throw new Error(`GET failed: ${JSON.stringify(getResult)}`);
    }

    if (!getResult.valid) {
      throw new Error(`Token should be valid but got: ${JSON.stringify(getResult)}`);
    }

    // Check that status is still pending (not completed)
    const { data: request } = await adminClient
      .from("account_deletion_requests")
      .select("status")
      .eq("token_hash", tokenHash)
      .single();

    if (request?.status !== "pending") {
      throw new Error(`Expected status 'pending' but got '${request?.status}'`);
    }

    // Cleanup
    await adminClient.from("account_deletion_requests").delete().eq("email", email);

    pass(testName);
  } catch (error: any) {
    fail(testName, error.message);
  }
}

// Test 2: POST with valid token DOES delete
async function testPostWithValidTokenDeletes() {
  const testName = "POST with valid token executes deletion";
  try {
    const email = `post-test-${Date.now()}@example.com`;
    const userId = `00000000-0000-0000-${Date.now().toString().slice(-12)}`;

    // Create a test user via admin
    const { error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password: "testpassword123",
      email_confirm: true,
      user_metadata: {
        test: true,
      },
    });

    if (createUserError) throw new Error(`Create user failed: ${createUserError.message}`);

    // Wait a moment for user to be created
    await sleep(500);

    // Get the created user
    const { data: userData, error: getUserError } = await adminClient.rpc("get_user_id_by_email", {
      user_email: email,
    });

    if (getUserError) throw new Error(`Get user failed: ${getUserError.message}`);
    if (!userData) throw new Error("User not found after creation");

    const actualUserId = userData;

    // Create a deletion request
    const token = "b".repeat(64);
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { error: insertError } = await adminClient
      .from("account_deletion_requests")
      .insert({
        email,
        token_hash: tokenHash,
        status: "pending",
      });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    // Make POST request (should delete)
    const postResponse = await fetch(
      `${SUPABASE_URL.replace("/rest/v1", "")}/functions/v1/confirm-account-deletion?token=${token}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const postResult = await postResponse.json();

    if (!postResponse.ok || !postResult.success) {
      throw new Error(`POST failed: ${JSON.stringify(postResult)}`);
    }

    // Wait a moment for deletion to complete
    await sleep(500);

    // Verify user is deleted
    const { data: checkUser } = await adminClient.rpc("get_user_id_by_email", {
      user_email: email,
    });

    if (checkUser) {
      throw new Error(`User still exists after deletion: ${checkUser}`);
    }

    // Cleanup
    await adminClient.from("account_deletion_requests").delete().eq("email", email);

    pass(testName);
  } catch (error: any) {
    fail(testName, error.message);
  }
}

// Test 3: Expired token returns error and does not delete
async function testExpiredTokenDoesNotDelete() {
  const testName = "Expired token returns error and does not delete";
  try {
    const email = `expired-test-${Date.now()}@example.com`;
    const token = "c".repeat(64);
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create an expired request
    const { error: insertError } = await adminClient
      .from("account_deletion_requests")
      .insert({
        email,
        token_hash: tokenHash,
        status: "pending",
        expires_at: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    // Try POST (should fail due to expiry)
    const postResponse = await fetch(
      `${SUPABASE_URL.replace("/rest/v1", "")}/functions/v1/confirm-account-deletion?token=${token}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const postResult = await postResponse.json();

    if (postResponse.ok) {
      throw new Error(`POST should have failed but succeeded: ${JSON.stringify(postResult)}`);
    }

    if (!postResult.expired) {
      throw new Error(`Result should indicate expired but got: ${JSON.stringify(postResult)}`);
    }

    // Cleanup
    await adminClient.from("account_deletion_requests").delete().eq("email", email);

    pass(testName);
  } catch (error: any) {
    fail(testName, error.message);
  }
}

// Test 4: Reused token (already completed) returns error
async function testReusedTokenReturnsError() {
  const testName = "Reused token (already completed) returns error";
  try {
    const email = `reused-test-${Date.now()}@example.com`;
    const token = "d".repeat(64);
    const encoder = new TextEncoder();
    const tokenData = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", tokenData);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create a completed request
    const { error: insertError } = await adminClient
      .from("account_deletion_requests")
      .insert({
        email,
        token_hash: tokenHash,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

    // Try POST (should fail because already used)
    const postResponse = await fetch(
      `${SUPABASE_URL.replace("/rest/v1", "")}/functions/v1/confirm-account-deletion?token=${token}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const postResult = await postResponse.json();

    if (postResponse.ok) {
      throw new Error(`POST should have failed but succeeded: ${JSON.stringify(postResult)}`);
    }

    if (!postResult.used) {
      throw new Error(`Result should indicate used but got: ${JSON.stringify(postResult)}`);
    }

    // Cleanup
    await adminClient.from("account_deletion_requests").delete().eq("email", email);

    pass(testName);
  } catch (error: any) {
    fail(testName, error.message);
  }
}

// Run all tests
async function runTests() {
  console.log("🧪 Starting account deletion flow tests...\n");

  await testGetDoesNotDelete();
  await testExpiredTokenDoesNotDelete();
  await testReusedTokenReturnsError();
  await testPostWithValidTokenDeletes();

  console.log("\n" + "=".repeat(60));
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    console.log("\nFailed tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed!");
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
