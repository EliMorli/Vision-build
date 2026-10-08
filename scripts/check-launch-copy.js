#!/usr/bin/env node

/**
 * check-launch-copy.js
 * 
 * Fails if forbidden contractor-related terms appear in user-facing strings
 * in app/ or components/, outside files gated behind the contractor outreach flag.
 * 
 * Forbidden terms: "contractor", "matched", "24-48 hours" (case-insensitive)
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

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
      `or add the file to the ALLOWLIST in scripts/check-launch-copy.js if it's gated behind CONTRACTOR_OUTREACH_ENABLED.\n`
    );
    process.exit(1);
  }
}

main();
