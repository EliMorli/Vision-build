#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

/**
 * Integration test for account deletion storage cleanup
 * Tests that deleteUserData recursively removes all objects under user prefixes in ALL buckets
 * 
 * Requires Supabase local stack to be running: supabase start
 * 
 * Usage: deno run --allow-net --allow-env --allow-read scripts/integration-tests/test-storage-deletion.ts
 */

/* eslint-disable import/no-unresolved */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deleteUserData } from "../../supabase/functions/_shared/delete-user-data.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

interface TestResult {
  passed: boolean;
  message: string;
}

async function runTest(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  
  console.log("🔧 Connecting to Supabase local instance...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  // Create a test user
  const testUserId = `test-user-${Date.now()}`;
  const testEmail = `${testUserId}@test.local`;
  
  console.log(`📝 Creating test user: ${testUserId}`);
  
  const { data: { user }, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "test-password-123",
    email_confirm: true,
    user_metadata: { test: true },
  });
  
  if (createError || !user) {
    results.push({
      passed: false,
      message: `Failed to create test user: ${createError?.message}`,
    });
    return results;
  }
  
  const userId = user.id;
  console.log(`✅ Created user: ${userId}`);
  
  // Create a test project
  console.log("📝 Creating test project...");
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      status: "generated",
      original_image_url: `${userId}/test-project/original.jpg`,
    })
    .select()
    .single();
  
  if (projectError || !project) {
    results.push({
      passed: false,
      message: `Failed to create project: ${projectError?.message}`,
    });
    return results;
  }
  
  const projectId = project.id;
  console.log(`✅ Created project: ${projectId}`);
  
  // Upload test files to storage
  console.log("📝 Uploading test files to storage...");
  
  // Test data - 1x1 transparent PNG
  const testImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const testImageBuffer = Uint8Array.from(atob(testImageBase64), c => c.charCodeAt(0));
  const testBlob = new Blob([testImageBuffer], { type: "image/png" });
  
  // Upload to room-photos bucket with nested structure
  const roomPhotosPaths = [
    `${userId}/${projectId}/original.jpg`,
    `${userId}/${projectId}/design-0.png`,
    `${userId}/${projectId}/design-1.png`,
    `${userId}/another-project/original.jpg`,
  ];
  
  for (const path of roomPhotosPaths) {
    const { error } = await supabase.storage
      .from("room-photos")
      .upload(path, testBlob, { upsert: true });
    
    if (error) {
      results.push({
        passed: false,
        message: `Failed to upload ${path}: ${error.message}`,
      });
      return results;
    }
  }
  console.log(`✅ Uploaded ${roomPhotosPaths.length} files to room-photos`);
  
  // Upload to public-designs bucket
  const publicDesignsPaths = [
    `${userId}/${projectId}/design-0.png`,
    `${projectId}/design-0.png`,
    `${projectId}/design-1.png`,
  ];
  
  for (const path of publicDesignsPaths) {
    const { error } = await supabase.storage
      .from("public-designs")
      .upload(path, testBlob, { upsert: true });
    
    if (error) {
      results.push({
        passed: false,
        message: `Failed to upload ${path}: ${error.message}`,
      });
      return results;
    }
  }
  console.log(`✅ Uploaded ${publicDesignsPaths.length} files to public-designs`);
  
  // Verify files exist before deletion
  console.log("🔍 Verifying files exist...");
  const { data: roomPhotosListBefore } = await supabase.storage
    .from("room-photos")
    .list(userId);
  
  if (!roomPhotosListBefore || roomPhotosListBefore.length === 0) {
    results.push({
      passed: false,
      message: "No files found in room-photos before deletion",
    });
    return results;
  }
  console.log(`✅ Found ${roomPhotosListBefore.length} items in room-photos/${userId}`);
  
  // Execute deletion (without Apple auth code - simulates user cancel)
  console.log("🗑️  Executing account deletion...");
  const deleteResult = await deleteUserData({
    userId,
    userEmail: testEmail,
    userAppMetadata: { provider: "email" },
    userIdentities: [],
    supabase,
    // No appleAuthCode - simulates user cancelling
  });
  
  results.push({
    passed: deleteResult.success === true,
    message: deleteResult.success ? "Deletion completed successfully" : "Deletion failed",
  });
  
  if (!deleteResult.success) {
    return results;
  }
  
  // Verify all files are deleted from room-photos
  console.log("🔍 Verifying storage cleanup in room-photos...");
  const { data: roomPhotosListAfter } = await supabase.storage
    .from("room-photos")
    .list(userId);
  
  results.push({
    passed: (!roomPhotosListAfter || roomPhotosListAfter.length === 0),
    message: roomPhotosListAfter && roomPhotosListAfter.length > 0
      ? `room-photos cleanup incomplete: ${roomPhotosListAfter.length} items remain under ${userId}`
      : `room-photos cleanup complete: all files under ${userId} deleted`,
  });
  
  // Verify all files are deleted from public-designs (both userId and projectId prefixes)
  console.log("🔍 Verifying storage cleanup in public-designs...");
  const { data: publicDesignsUserList } = await supabase.storage
    .from("public-designs")
    .list(userId);
  
  const { data: publicDesignsProjectList } = await supabase.storage
    .from("public-designs")
    .list(projectId);
  
  const userFilesRemain = publicDesignsUserList && publicDesignsUserList.length > 0;
  const projectFilesRemain = publicDesignsProjectList && publicDesignsProjectList.length > 0;
  
  results.push({
    passed: !userFilesRemain,
    message: userFilesRemain
      ? `public-designs cleanup incomplete: ${publicDesignsUserList?.length} items remain under ${userId}`
      : `public-designs cleanup complete: all files under ${userId} deleted`,
  });
  
  results.push({
    passed: !projectFilesRemain,
    message: projectFilesRemain
      ? `public-designs cleanup incomplete: ${publicDesignsProjectList?.length} items remain under ${projectId}`
      : `public-designs cleanup complete: all files under ${projectId} deleted`,
  });
  
  // Verify database rows are deleted
  console.log("🔍 Verifying database cleanup...");
  const { data: projectsAfter } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId);
  
  results.push({
    passed: (!projectsAfter || projectsAfter.length === 0),
    message: projectsAfter && projectsAfter.length > 0
      ? `Database cleanup incomplete: ${projectsAfter.length} projects remain`
      : "Database cleanup complete: all projects deleted",
  });
  
  // Verify auth user is deleted
  console.log("🔍 Verifying auth user deletion...");
  const { data: { user: userAfter } } = await supabase.auth.admin.getUserById(userId);
  
  results.push({
    passed: userAfter === null,
    message: userAfter !== null
      ? "Auth user deletion failed: user still exists"
      : "Auth user deletion complete",
  });
  
  return results;
}

// Run the test
console.log("🧪 Starting storage deletion integration test\n");

try {
  const results = await runTest();
  
  console.log("\n" + "=".repeat(60));
  console.log("TEST RESULTS");
  console.log("=".repeat(60));
  
  let passCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} ${result.message}`);
    
    if (result.passed) {
      passCount++;
    } else {
      failCount++;
    }
  }
  
  console.log("=".repeat(60));
  console.log(`PASSED: ${passCount} | FAILED: ${failCount}`);
  console.log("=".repeat(60) + "\n");
  
  if (failCount > 0) {
    Deno.exit(1);
  }
  
  console.log("✨ All tests passed!\n");
  Deno.exit(0);
} catch (error) {
  console.error("❌ Test execution failed:", error);
  Deno.exit(1);
}
