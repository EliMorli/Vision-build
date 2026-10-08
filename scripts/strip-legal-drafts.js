#!/usr/bin/env node
/**
 * Strip DRAFT banners and [NOTE] lines from legal pages for release builds
 * Fails if any unfilled blanks (placeholders in brackets) remain
 * 
 * Usage:
 *   node scripts/strip-legal-drafts.js          # Check all legal files
 *   node scripts/strip-legal-drafts.js --check  # Check only (no output)
 * 
 * Processes: app/terms.tsx, app/privacy.tsx, content/legal/*.md
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const LEGAL_TSX_FILES = [
  path.join(__dirname, '..', 'app', 'terms.tsx'),
  path.join(__dirname, '..', 'app', 'privacy.tsx'),
];

const LEGAL_MD_FILES = glob.sync(path.join(__dirname, '..', 'content', 'legal', '*.md'));

const ALL_LEGAL_FILES = [...LEGAL_TSX_FILES, ...LEGAL_MD_FILES];

let hasErrors = false;

// Placeholder patterns that indicate unfilled content
const PLACEHOLDER_PATTERNS = [
  /\[support@yourdomain\.com\]/,
  /\[COMPANY_NAME\]/i,
  /\[YOUR_.*?\]/i,
  /\bTBD\b/,
  /\[TBD\]/,
  /\[INSERT.*?\]/i,
];

function checkPlaceholders(content, filename) {
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      const match = content.match(pattern);
      console.error(`❌ ERROR in ${filename}:`);
      console.error(`   Found unfilled placeholder: ${match[0]}`);
      hasErrors = true;
    }
  }
}

function stripDraftContent(content, filename) {
  const isTsx = filename.endsWith('.tsx');
  
  if (isTsx) {
    // Extract markdown string content from TSX file
    const markdownMatch = content.match(/const\s+\w+Markdown\s*=\s*"([\s\S]+?)";\s*export default/);
    
    if (!markdownMatch) {
      console.error(`❌ ERROR in ${filename}: Could not extract markdown content`);
      hasErrors = true;
      return content;
    }
    
    const markdownContent = markdownMatch[1];
    
    // Check for DRAFT banner
    if (/DRAFT/i.test(markdownContent)) {
      console.error(`❌ ERROR in ${filename}:`);
      console.error(`   Found DRAFT banner`);
      hasErrors = true;
    }
    
    // Check for unfilled placeholders
    checkPlaceholders(markdownContent, filename);
    
    // Check for [brackets] that indicate unfilled blanks
    const bracketRegex = /\[([^\]]{1,100})\]/g;
    const bracketMatches = [...markdownContent.matchAll(bracketRegex)];
    
    const suspiciousBrackets = bracketMatches
      .map(m => m[0])
      .filter(text => {
        // Allow footnote numbers: [1], [2], etc.
        if (/^\[\d+\]$/.test(text)) return false;
        // Allow markdown link text (will be followed by (url))
        const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/;
        const fullMatch = markdownContent.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\([^)]+\\)'));
        return !fullMatch;
      });
    
    if (suspiciousBrackets.length > 0) {
      console.error(`❌ ERROR in ${filename}:`);
      console.error(`   Found potential unfilled blank(s):`);
      suspiciousBrackets.forEach(text => {
        console.error(`     ${text}`);
      });
      hasErrors = true;
    }
    
    // Strip DRAFT banner lines
    let stripped = content.replace(
      /> \*\*DRAFT.*?\*\*\n/g,
      ''
    );
    
    // Strip [NOTE: ...] lines
    stripped = stripped.replace(
      /> \[NOTE:.*?\]\n/g,
      ''
    );
    
    // Strip [ATTORNEY DECISION: ...] lines
    stripped = stripped.replace(
      /> \[ATTORNEY DECISION:.*?\]\n/g,
      ''
    );
    
    // Strip [CONFIRM] markers
    stripped = stripped.replace(
      /\[CONFIRM\]/g,
      ''
    );
    
    return stripped;
  } else {
    // Process markdown files directly
    
    // Check for DRAFT banner
    if (/DRAFT/i.test(content)) {
      console.error(`❌ ERROR in ${filename}:`);
      console.error(`   Found DRAFT banner`);
      hasErrors = true;
    }
    
    // Check for unfilled placeholders
    checkPlaceholders(content, filename);
    
    return content;
  }
}

const checkOnly = process.argv.includes('--check');

console.log('🔍 Checking legal files for release...\n');

for (const filePath of ALL_LEGAL_FILES) {
  const filename = path.basename(filePath);
  console.log(`Processing ${filename}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ERROR: ${filename} not found`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const stripped = stripDraftContent(content, filename);
  
  if (!hasErrors) {
    console.log(`✅ ${filename} is ready for release`);
  }
}

console.log('');

if (hasErrors) {
  console.error('❌ Release build FAILED: Legal files contain unfilled placeholders or DRAFT banners');
  process.exit(1);
} else {
  console.log('✅ All legal files validated successfully');
  process.exit(0);
}
