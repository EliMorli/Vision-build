/**
 * Shared AI model configuration
 * Used by both the React Native app and Deno Edge Functions
 * 
 * IMPORTANT: This file reads from lib/ai-models.json which is the single source of truth.
 * The JSON file is also read by supabase/functions/_shared/ai.ts
 * A check in scripts/check-zdr-models.mjs ensures they stay in sync.
 */

import aiModelsConfig from "./ai-models.json";

export interface AIModelConfig {
  vision: string;
  text: string;
  chat: string;
  renderPreview: string;
  renderFinal: string;
}

/**
 * Default AI models (OpenRouter model IDs, all on ZDR endpoint list)
 * Loaded from lib/ai-models.json
 */
export const AI_MODELS: AIModelConfig = aiModelsConfig.models;

/**
 * Extract vendor from OpenRouter model ID (e.g., "google/gemini-2.5-pro" → "google")
 */
function getVendor(modelId: string): string {
  return modelId.split("/")[0];
}

/**
 * Map vendor to display name
 * Loaded from lib/ai-models.json
 */
const VENDOR_DISPLAY_NAMES: Record<string, string> = aiModelsConfig.vendorDisplayNames;

/**
 * Get unique AI providers from the configured models
 * Returns an array of display names like ["Google (Gemini)", "Anthropic (Claude)"]
 */
export function getAIProviders(): string[] {
  const vendors = new Set<string>();
  
  // Extract vendors from all model configurations
  vendors.add(getVendor(AI_MODELS.vision));
  vendors.add(getVendor(AI_MODELS.text));
  vendors.add(getVendor(AI_MODELS.chat));
  vendors.add(getVendor(AI_MODELS.renderPreview));
  vendors.add(getVendor(AI_MODELS.renderFinal));
  
  // Map to display names, filter out unknown vendors
  return Array.from(vendors)
    .map(vendor => VENDOR_DISPLAY_NAMES[vendor])
    .filter((name): name is string => name !== undefined)
    .sort(); // Sort alphabetically for consistency
}

/**
 * Generate the provider disclosure text for the consent screen
 */
export function getProviderDisclosureText(): string {
  const providers = getAIProviders();
  
  if (providers.length === 0) {
    return "Your photos and chats go to AI providers through OpenRouter.";
  }
  
  const providerList = providers.join(" and ");
  return `Your photos and chats go to ${providerList} through OpenRouter.`;
}
