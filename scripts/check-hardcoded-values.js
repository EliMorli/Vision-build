#!/usr/bin/env node

/**
 * Lint script: Check for hardcoded emails and domains
 * 
 * Fails if any of these hardcoded values are found:
 * - noreply@visionbuild.app
 * - visionbuild.app (except in comments, package.json, or specific allowed contexts)
 * 
 * All emails and domains should come from business config / env vars.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// eslint-disable-next-line no-undef
const ROOT = path.resolve(__dirname, "..");

// Files and patterns to exclude
const EXCLUDE_PATTERNS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  ".expo",
  "*.md", // Allow in documentation
  "package.json",
  "package-lock.json",
  "scripts/check-hardcoded-values.ts", // This file
];

/**
 * @typedef {Object} Match
 * @property {string} file
 * @property {number} line
 * @property {string} content
 * @property {string} value
 */

function checkHardcodedValues() {
  /** @type {Match[]} */
  const matches = [];

  // Search for hardcoded email
  try {
    const emailResult = execSync(
      `cd ${ROOT} && rg -n "noreply@visionbuild\\.app" --type ts --type tsx --type js --type jsx --glob "!node_modules" --glob "!*.md" --glob "!scripts/check-hardcoded-values.ts" || true`,
      { encoding: "utf-8" }
    );

    if (emailResult.trim()) {
      const lines = emailResult.trim().split("\n");
      lines.forEach((line) => {
        const match = line.match(/^([^:]+):(\d+):(.+)$/);
        if (match) {
          matches.push({
            file: match[1],
            line: parseInt(match[2], 10),
            content: match[3].trim(),
            value: "noreply@visionbuild.app",
          });
        }
      });
    }
  } catch (err) {
    // rg returns non-zero if no matches, which is fine
  }

  // Search for hardcoded domain (more complex - need to exclude valid usage)
  try {
    const domainResult = execSync(
      `cd ${ROOT} && rg -n "visionbuild\\.app" --type ts --type tsx --type js --type jsx --glob "!node_modules" --glob "!*.md" --glob "!package.json" --glob "!scripts/check-hardcoded-values.ts" || true`,
      { encoding: "utf-8" }
    );

    if (domainResult.trim()) {
      const lines = domainResult.trim().split("\n");
      lines.forEach((line) => {
        const match = line.match(/^([^:]+):(\d+):(.+)$/);
        if (match) {
          const content = match[3].trim();
          
          // Skip if it's in a comment
          if (content.includes("//") || content.includes("/*") || content.includes("*/")) {
            return;
          }

          // Skip if it's in specific allowed contexts
          // (e.g., URL constants that will be replaced, or test fixtures)
          if (
            content.includes("{{WEBSITE_DOMAIN}}") ||
            content.includes("[WEBSITE_DOMAIN]") ||
            content.includes("config.websiteDomain") ||
            content.includes("business.websiteDomain")
          ) {
            return;
          }

          matches.push({
            file: match[1],
            line: parseInt(match[2], 10),
            content: content,
            value: "visionbuild.app",
          });
        }
      });
    }
  } catch (err) {
    // rg returns non-zero if no matches, which is fine
  }

  return matches;
}

// Run the check
const matches = checkHardcodedValues();

if (matches.length > 0) {
  console.error("\n❌ Found hardcoded emails/domains:\n");
  matches.forEach((m) => {
    console.error(`  ${m.file}:${m.line}`);
    console.error(`    ${m.content}`);
    console.error(`    ^ Contains hardcoded: ${m.value}\n`);
  });
  console.error("All emails and domains should come from business config / env vars.");
  console.error("See: lib/config/business.ts and supabase/functions/_shared/business.ts\n");
  process.exit(1);
} else {
  console.log("✅ No hardcoded emails or domains found");
  process.exit(0);
}
