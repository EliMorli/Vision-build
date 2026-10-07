import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface RateLimitConfig {
  action: string;
  limit: number;
  windowMs: number;
}

const DEFAULT_LIMITS: Record<string, RateLimitConfig> = {
  "analyze-room": { action: "analyze-room", limit: 10, windowMs: 24 * 60 * 60 * 1000 }, // 10/day
  "generate-design": { action: "generate-design", limit: 5, windowMs: 24 * 60 * 60 * 1000 }, // 5/day
  "dispatch-lead": { action: "dispatch-lead", limit: 3, windowMs: 24 * 60 * 60 * 1000 }, // 3/day
};

/**
 * Check and enforce per-user rate limits.
 * Returns 429 response if rate limit exceeded, null if OK.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string
): Promise<Response | null> {
  // Get limit config (env override or default)
  const envLimit = Deno.env.get(`RATE_LIMIT_${action.toUpperCase().replace("-", "_")}`);
  const config = DEFAULT_LIMITS[action] || { action, limit: 10, windowMs: 24 * 60 * 60 * 1000 };
  
  if (envLimit) {
    config.limit = parseInt(envLimit, 10);
  }

  // Count recent usage events
  const windowStart = new Date(Date.now() - config.windowMs).toISOString();
  
  const { data: events, error } = await supabase
    .from("usage_events")
    .select("id")
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", windowStart);

  if (error) {
    console.error("Rate limit check error:", error);
    return null; // Fail open
  }

  if ((events?.length ?? 0) >= config.limit) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        code: "rate_limited",
        message: `You've reached the daily limit for ${action}. Please try again tomorrow.`,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(config.windowMs / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Record a usage event after successful action.
 */
export async function recordUsage(
  supabase: SupabaseClient,
  userId: string,
  action: string
): Promise<void> {
  await supabase.from("usage_events").insert({
    user_id: userId,
    action,
  });
}
