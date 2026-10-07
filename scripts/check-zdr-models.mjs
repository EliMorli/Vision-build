#!/usr/bin/env node
/**
 * Validate that all configured AI models are on OpenRouter's ZDR endpoint list
 * 
 * This ensures that all models used in production have zero data retention,
 * which is critical for our privacy commitments.
 * 
 * Run this before changing AI_MODEL_* environment variables:
 *   npm run check:models
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default models from the codebase (must match supabase/functions/_shared/ai.ts)
const DEFAULT_MODELS = {
  AI_MODEL_VISION: 'google/gemini-2.5-pro',
  AI_MODEL_TEXT: 'anthropic/claude-sonnet-5.5',
  AI_MODEL_CHAT: 'anthropic/claude-sonnet-5.5',
  AI_MODEL_RENDER_PREVIEW: 'google/gemini-3.1-flash-image',
  AI_MODEL_RENDER_FINAL: 'google/gemini-3.1-flash-image',
};

async function fetchZDREndpoints() {
  console.log('Fetching OpenRouter ZDR endpoint list...');
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/endpoints/zdr');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The response format is { data: [ { model_id: "...", ... }, ... ] }
    let modelIds = [];
    
    if (data.data && Array.isArray(data.data)) {
      modelIds = data.data.map(item => item.model_id);
    } else if (Array.isArray(data)) {
      // Fallback for simple array format
      modelIds = data;
    } else {
      console.warn('Warning: Unexpected response format from ZDR endpoint');
      console.log('Response keys:', Object.keys(data));
      modelIds = [];
    }
    
    return new Set(modelIds);
  } catch (error) {
    console.error('Error fetching ZDR endpoints:', error.message);
    throw error;
  }
}

function getConfiguredModels() {
  const models = {};
  
  // Get models from environment variables
  for (const [key, defaultValue] of Object.entries(DEFAULT_MODELS)) {
    models[key] = process.env[key] || defaultValue;
  }
  
  return models;
}

async function main() {
  console.log('VisionBuild OpenRouter ZDR Model Validator\n');
  
  // Get ZDR-compliant models
  let zdrModels;
  try {
    zdrModels = await fetchZDREndpoints();
    console.log(`✓ Found ${zdrModels.size} models on ZDR endpoint list\n`);
  } catch (error) {
    console.error('✗ Failed to fetch ZDR endpoint list');
    console.error('  Cannot validate models without the list.');
    console.error('  Check your internet connection and try again.\n');
    process.exit(1);
  }
  
  // Get configured models
  const configuredModels = getConfiguredModels();
  
  console.log('Checking configured models:\n');
  
  let allValid = true;
  const issues = [];
  
  for (const [envVar, modelId] of Object.entries(configuredModels)) {
    const isDefault = modelId === DEFAULT_MODELS[envVar];
    const isOnZDR = zdrModels.has(modelId);
    const source = isDefault ? '(default)' : '(from env)';
    
    if (isOnZDR) {
      console.log(`  ✓ ${envVar}: ${modelId} ${source}`);
    } else {
      console.log(`  ✗ ${envVar}: ${modelId} ${source} - NOT ON ZDR LIST`);
      allValid = false;
      issues.push({
        envVar,
        modelId,
        isDefault,
      });
    }
  }
  
  console.log();
  
  if (!allValid) {
    console.error('❌ VALIDATION FAILED\n');
    console.error('The following models are NOT on OpenRouter\'s ZDR endpoint list:\n');
    
    for (const issue of issues) {
      console.error(`  • ${issue.envVar}: ${issue.modelId}`);
      if (issue.isDefault) {
        console.error(`    This is a DEFAULT model in the code and must be fixed!`);
      } else {
        console.error(`    Set via environment variable - remove or change to a ZDR-compliant model.`);
      }
    }
    
    console.error('\nUsing non-ZDR models in production would violate our privacy commitments.');
    console.error('All models must support Zero Data Retention (zdr: true).\n');
    console.error('Check OpenRouter\'s ZDR model list: https://openrouter.ai/docs/guides/features/zdr\n');
    
    process.exit(1);
  }
  
  console.log('✅ All configured models are on the ZDR endpoint list!\n');
  console.log('Safe to deploy to production.\n');
  
  process.exit(0);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
