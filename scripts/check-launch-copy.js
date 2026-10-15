#!/usr/bin/env node

/**
 * check-launch-copy.js
 * 
 * Fails if forbidden contractor-related terms appear in user-facing strings
 * in app/ or components/, outside files gated behind the contractor outreach flag.
 * 
 * Also fails if 'quote' or 'quotes' appears in deletion screens (no quotes at launch).
 * 
 * Forbidden terms: "contractor", "matched", "24-48 hours" (case-insensitive)
 * Deletion-specific: "quote", "quotes" in app/delete-account/* (case-insensitive)
 * 
 * Allowlist: Files explicitly gated behind CONTRACTOR_OUTREACH_ENABLED feature flag.
 */

const fs = require('fs');
const path = require('path');

// Files that are gated behind the contractor outreach flag
const ALLOWLIST = [
  'app/handoff/[id].tsx',
  'app/handoff-location.tsx',
  'app/handoff-confirm.tsx',
  'app/terms.tsx', // Legal terms document mentions contractors
  'components/ReportModal.tsx', // Report type includes contractors for future use
  'supabase/functions/dispatch-lead/index.ts',
  'supabase/functions/dispatch-lead/index_test.ts',
  'lib/store.ts', // contains dispatchLeads function gated in implementation
];

// Forbidden terms (case-insensitive)
const FORBIDDEN_PATTERNS = [
  /\bcontractor\b/i,
  /\bmatched\b/i,
  /\b24-48 hours\b/i,
];

// Deletion-specific forbidden patterns
const DELETION_FORBIDDEN_PATTERNS = [
  /\bquote\b/i,
  /\bquotes\b/i,
];

// Vi (the AI assistant) must not offer pros, contractors or quotes: no
// "Find me a pro" button and no link to the pros screen. The Pros waitlist
// lives on Home and Results only.
const VI_FILES = [
  'components/AssistantChat.tsx',
  'app/(tabs)/(vi)/vi.tsx',
  'app/(tabs)/(vi,profile,home)/assistant-chat.tsx',
];
const VI_FORBIDDEN_PATTERNS = [
  /find me a pro/i,
  /pros-coming-soon/,
  /\bcontractors?\b/i,
  /\bquotes?\b/i,
];

// The intro carousel is the first thing anyone sees: it must not promise
// pros, contractors, quotes or anything "coming soon" (nothing unlaunched).
const INTRO_FILES = ['app/intro.tsx'];
const INTRO_FORBIDDEN_PATTERNS = [
  /\bpros?\b/i,
  /\bcontractors?\b/i,
  /\bquotes?\b/i,
  /coming[\s-]+soon/i,
];

// No fixed time-left estimates anywhere in the app ("About 20 sec left"):
// Compliance only allows real progress. Applies to app/ and components/.
const TIME_ESTIMATE_PATTERNS = [
  /\bsec(?:ond)?s? left\b/i,
  /\bmin(?:ute)?s? left\b/i,
  /\btime left\b/i,
  /\bsetCountdown\b/,
];

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walkDir(filePath, fileList);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (!file.endsWith('.d.ts')) {
        fileList.push(filePath);
      }
    }
  }
  
  return fileList;
}

function main() {
  console.log('🔍 Checking for contractor-related launch copy violations...\n');

  // Find all TypeScript/TSX files in app/ and components/
  const appFiles = fs.existsSync('app') ? walkDir('app') : [];
  const componentFiles = fs.existsSync('components') ? walkDir('components') : [];
  const files = [...appFiles, ...componentFiles];

  let violations = [];

  for (const file of files) {
    // Normalize path separators for cross-platform comparison
    const normalizedFile = file.replace(/\\/g, '/');
    
    // Skip allowlisted files
    if (ALLOWLIST.some(allowed => normalizedFile.endsWith(allowed))) {
      console.log(`⏭️  Skipped (allowlisted): ${normalizedFile}`);
      continue;
    }

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    // Check if this is a deletion file
    const isDeletionFile = normalizedFile.includes('app/delete-account/');
    const isViFile = VI_FILES.some((viFile) => normalizedFile.endsWith(viFile));
    const isIntroFile = INTRO_FILES.some((f) => normalizedFile.endsWith(f));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check general forbidden patterns
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: normalizedFile,
            line: lineNum,
            content: line.trim(),
            term: pattern.source,
          });
        }
      }

      // Check Vi-specific patterns
      if (isViFile) {
        for (const pattern of VI_FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: normalizedFile,
              line: lineNum,
              content: line.trim(),
              term: pattern.source + ' (no pros or contractor actions in Vi)',
            });
          }
        }
      }

      // Check fixed time-left estimates
      for (const pattern of TIME_ESTIMATE_PATTERNS) {
        if (pattern.test(line)) {
          violations.push({
            file: normalizedFile,
            line: lineNum,
            content: line.trim(),
            term: pattern.source + ' (no fixed countdowns; show real progress)',
          });
        }
      }

      // Check intro carousel patterns
      if (isIntroFile) {
        for (const pattern of INTRO_FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: normalizedFile,
              line: lineNum,
              content: line.trim(),
              term: pattern.source + ' (no pros or coming-soon promises in the intro)',
            });
          }
        }
      }

      // Check deletion-specific patterns
      if (isDeletionFile) {
        for (const pattern of DELETION_FORBIDDEN_PATTERNS) {
          if (pattern.test(line)) {
            violations.push({
              file: normalizedFile,
              line: lineNum,
              content: line.trim(),
              term: pattern.source + ' (forbidden in deletion screens)',
            });
          }
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log('\n✅ No launch copy violations found.\n');
    process.exit(0);
  } else {
    console.error('\n❌ Launch copy violations found:\n');
    violations.forEach(({ file, line, content, term }) => {
      console.error(`  ${file}:${line}`);
      console.error(`    Pattern: ${term}`);
      console.error(`    Line: ${content}\n`);
    });
    console.error(
      `Found ${violations.length} violation(s). Remove contractor-related terms from homeowner-facing UI,\n` +
      `or add the file to the ALLOWLIST in scripts/check-launch-copy.js if it's gated behind CONTRACTOR_OUTREACH_ENABLED.\n` +
      `For deletion screens, 'quote'/'quotes' are forbidden (no quotes at launch).\n` +
      `In Vi, "Find me a pro", links to pros-coming-soon, contractors and quotes are forbidden.\n`
    );
    process.exit(1);
  }
}

main();
