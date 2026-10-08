/**
 * Pre-launch configuration checker
 * Validates that all required environment variables and business config are set
 */

import { getIncompleteBusinessConfig } from "../lib/config/business";

interface CheckResult {
  name: string;
  required: boolean;
  present: boolean;
  value?: string;
}

const ENV_CHECKS: CheckResult[] = [
  // Supabase
  {
    name: "EXPO_PUBLIC_SUPABASE_URL",
    required: true,
    present: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
    value: process.env.EXPO_PUBLIC_SUPABASE_URL,
  },
  {
    name: "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    required: true,
    present: !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: true,
    present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // AI Services
  {
    name: "OPENROUTER_API_KEY",
    required: true,
    present: !!process.env.OPENROUTER_API_KEY,
  },
  
  // Email
  {
    name: "RESEND_API_KEY",
    required: true,
    present: !!process.env.RESEND_API_KEY,
  },
  {
    name: "EXPO_PUBLIC_SUPPORT_EMAIL",
    required: true,
    present: !!process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
    value: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  },
  
  // OAuth (required for real auth)
  {
    name: "GOOGLE_CLIENT_ID",
    required: false,
    present: !!process.env.GOOGLE_CLIENT_ID,
  },
  {
    name: "APPLE_CLIENT_ID",
    required: false,
    present: !!process.env.APPLE_CLIENT_ID,
  },
  
  // Admin
  {
    name: "ADMIN_EMAILS",
    required: false,
    present: !!process.env.ADMIN_EMAILS,
    value: process.env.ADMIN_EMAILS,
  },
];

// Note: Vault secrets (project_url, service_role_key) must be created in Supabase Vault
// for the hourly retry-account-deletions cron job. They cannot be checked from Node.js
// because they are only accessible via SQL. Check them manually:
//   SELECT name FROM vault.decrypted_secrets WHERE name IN ('project_url', 'service_role_key');

function printCheck(check: CheckResult) {
  const icon = check.present ? "✓" : "✗";
  const status = check.present ? "SET" : "MISSING";
  const required = check.required ? "[REQUIRED]" : "[OPTIONAL]";
  const color = check.present ? "\x1b[32m" : check.required ? "\x1b[31m" : "\x1b[33m";
  const reset = "\x1b[0m";
  
  console.log(`${color}${icon}${reset} ${check.name} ${required}: ${color}${status}${reset}`);
  
  if (check.present && check.value && !check.value.includes("KEY")) {
    console.log(`    Value: ${check.value}`);
  }
}

function main() {
  const isDev = process.env.APP_ENV !== "production" && process.env.NODE_ENV !== "production";
  
  console.log("\n🔍 VisionBuild Configuration Doctor\n");
  console.log(`Environment: ${isDev ? "DEVELOPMENT" : "PRODUCTION"}\n`);
  
  // Check environment variables
  console.log("📋 Environment Variables:\n");
  
  let missingRequired = 0;
  let missingOptional = 0;
  
  for (const check of ENV_CHECKS) {
    printCheck(check);
    if (!check.present) {
      if (check.required) {
        missingRequired++;
      } else {
        missingOptional++;
      }
    }
  }
  
  // Check business config
  console.log("\n\n📋 Business Configuration:\n");
  
  const missingBusiness = getIncompleteBusinessConfig();
  
  if (missingBusiness.length === 0) {
    console.log("\x1b[32m✓\x1b[0m All business config fields are set");
  } else {
    console.log("\x1b[31m✗\x1b[0m Missing business config:\n");
    for (const key of missingBusiness) {
      console.log(`  - ${key}`);
    }
  }
  
  // Summary
  console.log("\n\n📊 Summary:\n");
  
  const totalMissing = missingRequired + missingBusiness.length;
  
  if (totalMissing === 0) {
    console.log("\x1b[32m✓ All required configuration is complete!\x1b[0m");
    console.log("\nYou can deploy to production.");
    
    if (missingOptional > 0) {
      console.log(`\n⚠️  ${missingOptional} optional setting(s) not configured.`);
    }
    
    process.exit(0);
  } else {
    console.log(`\x1b[31m✗ ${totalMissing} required setting(s) missing\x1b[0m`);
    
    if (!isDev) {
      console.log("\n❌ Cannot deploy to production with missing configuration.");
      console.log("\nFill in the missing values in:");
      console.log("  - .env (environment variables)");
      console.log("  - lib/config/business.ts (business details)");
      console.log("  - supabase/functions/_shared/business.ts (server-side)");
      process.exit(1);
    } else {
      console.log("\n⚠️  Development mode: missing config is okay for local testing.");
      console.log("\nBut you'll need to fill these in before deploying to production.");
      process.exit(0);
    }
  }
}

main();
