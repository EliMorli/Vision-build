// Input validation helpers for AI edge functions.

export const MAX_USER_MESSAGE_CHARS = 4000;
export const MAX_HISTORY_MESSAGES = 30;

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Keep only well-formed user/assistant turns. Drops anything else (for example
 * a client-supplied "system" message that would override Vi's instructions),
 * trims each turn to MAX_USER_MESSAGE_CHARS and keeps the latest
 * MAX_HISTORY_MESSAGES turns.
 */
export function sanitizeConversationHistory(input: unknown): ChatTurn[] {
  if (!Array.isArray(input)) return [];
  const turns: ChatTurn[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") continue;
    const trimmed = content.slice(0, MAX_USER_MESSAGE_CHARS);
    if (!trimmed.trim()) continue;
    turns.push({ role, content: trimmed });
  }
  return turns.slice(-MAX_HISTORY_MESSAGES);
}

/**
 * The room photo sent for analysis must be a signed URL for the caller's own
 * folder in the private room-photos bucket of this Supabase project. This stops
 * the endpoint from being used to send arbitrary URLs (or other users' files)
 * to the AI provider.
 *
 * allowedBaseUrls: SUPABASE_URL plus, for local dev where the edge runtime sees
 * an internal URL (http://kong:8000), the optional PUBLIC_SUPABASE_URL secret.
 */
export function isOwnRoomPhotoUrl(
  imageUrl: unknown,
  allowedBaseUrls: string | Array<string | undefined>,
  userId: string,
): boolean {
  if (typeof imageUrl !== "string" || imageUrl.length > 4096) return false;
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return false;
  }
  const origins = (Array.isArray(allowedBaseUrls) ? allowedBaseUrls : [allowedBaseUrls])
    .map((b) => {
      try {
        return b ? new URL(b).origin : null;
      } catch {
        return null;
      }
    })
    .filter((o): o is string => !!o);
  if (!origins.includes(url.origin)) return false;
  const prefix = `/storage/v1/object/sign/room-photos/${userId}/`;
  if (!url.pathname.startsWith(prefix)) return false;
  if (url.pathname.includes("..")) return false;
  return url.searchParams.has("token");
}
