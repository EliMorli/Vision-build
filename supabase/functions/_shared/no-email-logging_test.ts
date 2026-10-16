// Test: Assert that no function logs email addresses
// Scans all *.ts files under supabase/functions for console.log/info/warn/error
// calls that interpolate email-like variables or fields

import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { walk } from "https://deno.land/std@0.192.0/fs/walk.ts";

const EMAIL_PATTERNS = [
  // Variable names that end with 'email' or 'Email': email, userEmail, contractorEmail, etc.
  /console\.(log|info|warn|error)\([^)]*\b\w*[Ee]mail(?![A-Za-z])\b[^)]*\)/g,
  // Property access: .email
  /console\.(log|info|warn|error)\([^)]*\.\s*email\b[^)]*\)/g,
];

async function scanFileForEmailLogging(filePath: string): Promise<string[]> {
  const content = await Deno.readTextFile(filePath);
  const violations: string[] = [];

  for (const pattern of EMAIL_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const matchText = match[0];
      // Skip false positives: comments, string literals, or "email" used as a verb
      if (
        matchText.includes("'email'") ||
        matchText.includes('"email"') ||
        matchText.includes("`email`") ||
        matchText.includes("// email") ||
        matchText.includes("/* email") ||
        // Skip if "email" appears in a string literal (e.g., "Failed to email contractor")
        /["'`].*\bemail\b.*["'`]/.test(matchText)
      ) {
        continue;
      }
      
      // Find line number
      const beforeMatch = content.substring(0, match.index);
      const lineNumber = beforeMatch.split("\n").length;
      
      violations.push(`${filePath}:${lineNumber} - ${matchText.trim()}`);
    }
  }

  return violations;
}

Deno.test("no email addresses in console logs across all functions", async () => {
  const violations: string[] = [];
  const functionsDir = new URL("../", import.meta.url).pathname;

  for await (const entry of walk(functionsDir, {
    exts: ["ts"],
    skip: [/_test\.ts$/, /test-utils\.ts$/],
  })) {
    if (entry.isFile) {
      const fileViolations = await scanFileForEmailLogging(entry.path);
      violations.push(...fileViolations);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} email logging violation(s):\n` +
      violations.join("\n")
    );
  }

  assertEquals(violations.length, 0, "No email should appear in console logs");
});

// Test with planted violation to prove the test catches issues
Deno.test("detector catches planted email logging violations", async () => {
  const testCode = `
    const userEmail = "test@example.com";
    console.log("Processing deletion for", userEmail);
    console.error("Failed for user:", user.email);
    console.warn("Contractor not found:", contractor.email);
  `;

  const tempFile = await Deno.makeTempFile({ suffix: ".ts" });
  try {
    await Deno.writeTextFile(tempFile, testCode);
    const violations = await scanFileForEmailLogging(tempFile);
    
    // Should catch userEmail, user.email, and contractor.email
    if (violations.length === 0) {
      throw new Error("Test detector failed to catch planted violations");
    }
    
    assertEquals(violations.length >= 3, true, `Should catch multiple email logging patterns, got ${violations.length}`);
  } finally {
    await Deno.remove(tempFile);
  }
});
