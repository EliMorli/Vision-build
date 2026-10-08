export const SUPPORT_EMAIL = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || "";

// This must match supabase/functions/_shared/consent.ts CURRENT_AI_CONSENT_VERSION
export const AI_CONSENT_VERSION = "2026-10-07b";

// Single source of truth for consent change description
// Update this when AI_CONSENT_VERSION changes to describe what changed
export const CONSENT_CHANGE_NOTE = "We now name the AI providers that see your photos.";
