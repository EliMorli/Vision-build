#!/usr/bin/env node
/**
 * Validate that client-side AI model config matches lib/ai-models.json
 * and that provider disclosure text derives correctly from the models
 * 
 * This ensures the consent screen shows accurate provider information.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load the shared AI models configuration
const aiModelsPath = resolve(__dirname, '../lib/ai-models.json');
const aiModelsConfig = JSON.parse(readFileSync(aiModelsPath, 'utf-8'));

console.log('Validating AI model configuration...\n');

// Validate JSON structure
if (!aiModelsConfig.models) {
  console.error('❌ ERROR: ai-models.json missing "models" object');
  process.exit(1);
}

if (!aiModelsConfig.vendorDisplayNames) {
  console.error('❌ ERROR: ai-models.json missing "vendorDisplayNames" object');
  process.exit(1);
}

// Required model fields
const requiredModels = ['vision', 'text', 'chat', 'renderPreview', 'renderFinal'];
for (const field of requiredModels) {
  if (!aiModelsConfig.models[field]) {
    console.error(`❌ ERROR: ai-models.json missing models.${field}`);
    process.exit(1);
  }
  
  // Validate OpenRouter format (vendor/model)
  const modelId = aiModelsConfig.models[field];
  if (!modelId.includes('/')) {
    console.error(`❌ ERROR: models.${field} "${modelId}" is not in OpenRouter format (vendor/model)`);
    process.exit(1);
  }
  
  console.log(`  ✓ models.${field}: ${modelId}`);
}

console.log();

// Extract unique vendors from models
const vendors = new Set();
for (const modelId of Object.values(aiModelsConfig.models)) {
  const vendor = modelId.split('/')[0];
  vendors.add(vendor);
}

console.log('Providers used:', Array.from(vendors).join(', '));

// Validate that all vendors have display names
let allVendorsHaveDisplayNames = true;
for (const vendor of vendors) {
  if (!aiModelsConfig.vendorDisplayNames[vendor]) {
    console.error(`❌ ERROR: Vendor "${vendor}" used in models but missing from vendorDisplayNames`);
    allVendorsHaveDisplayNames = false;
  } else {
    console.log(`  ✓ ${vendor} → ${aiModelsConfig.vendorDisplayNames[vendor]}`);
  }
}

if (!allVendorsHaveDisplayNames) {
  process.exit(1);
}

console.log();

// Generate provider disclosure text (matches lib/ai-models.ts logic)
const providerDisplayNames = Array.from(vendors)
  .map(vendor => aiModelsConfig.vendorDisplayNames[vendor])
  .filter(name => name !== undefined)
  .sort(); // Alphabetical order

const providerList = providerDisplayNames.join(' and ');
const disclosureText = `Your photos and chats go to ${providerList} through OpenRouter.`;

console.log('Generated provider disclosure text (alphabetical order):');
console.log(`  "${disclosureText}"`);
console.log();

// Validate exact expected disclosure for current config
const expectedDisclosure = "Your photos and chats go to Anthropic (Claude) and Google (Gemini) through OpenRouter.";
if (disclosureText !== expectedDisclosure) {
  console.error('❌ ERROR: Provider disclosure does not match expected value');
  console.error(`  Expected: "${expectedDisclosure}"`);
  console.error(`  Got:      "${disclosureText}"`);
  process.exit(1);
}
console.log('✓ Provider disclosure matches expected string');
console.log();

// Validate against Deno ai.ts defaults
console.log('Checking Deno Edge Function defaults...');
const denoAiPath = resolve(__dirname, '../supabase/functions/_shared/ai.ts');
const denoAiContent = readFileSync(denoAiPath, 'utf-8');

const modelChecks = [
  { key: 'vision', pattern: /AI_MODEL_VISION"\) \|\| "(.*?)"/ },
  { key: 'text', pattern: /AI_MODEL_TEXT"\) \|\| "(.*?)"/ },
  { key: 'chat', pattern: /AI_MODEL_CHAT"\) \|\| "(.*?)"/ },
  { key: 'renderPreview', pattern: /AI_MODEL_RENDER_PREVIEW"\) \|\| "(.*?)"/ },
  { key: 'renderFinal', pattern: /AI_MODEL_RENDER_FINAL"\) \|\| "(.*?)"/ },
];

let allMatch = true;
for (const { key, pattern } of modelChecks) {
  const match = denoAiContent.match(pattern);
  const denoDefault = match ? match[1] : null;
  const jsonValue = aiModelsConfig.models[key];
  
  if (denoDefault !== jsonValue) {
    console.error(`  ✗ ${key}: Mismatch!`);
    console.error(`    Deno ai.ts: ${denoDefault || 'NOT FOUND'}`);
    console.error(`    ai-models.json: ${jsonValue}`);
    allMatch = false;
  } else {
    console.log(`  ✓ ${key}: ${jsonValue}`);
  }
}

console.log();

if (!allMatch) {
  console.error('❌ VALIDATION FAILED');
  console.error('Deno ai.ts defaults do not match lib/ai-models.json');
  console.error('Update supabase/functions/_shared/ai.ts to match the JSON config.\n');
  process.exit(1);
}

console.log('✅ All validations passed!');
console.log('Client and server AI model configs are in sync.\n');
process.exit(0);
