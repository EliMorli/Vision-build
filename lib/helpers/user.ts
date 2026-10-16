import { Profile } from "../types";
import { Session } from "@supabase/supabase-js";

/**
 * Get the display name for a user from their profile.
 * Falls back to 'User' if no name is available.
 * 
 * @param profile - The user's profile object
 * @param user - Optional user object from session (fallback)
 * @returns The display name or 'User'
 */
export function getDisplayName(profile: Profile | null, user?: Session["user"] | null): string {
  if (profile?.display_name) {
    return profile.display_name;
  }
  
  if (user?.user_metadata?.full_name) {
    return user.user_metadata.full_name;
  }
  
  return "User";
}

/**
 * Get the first initial from a display name for avatar display.
 * 
 * @param displayName - The user's display name
 * @returns The first character uppercased, or 'U' as fallback
 */
export function getDisplayInitial(displayName: string): string {
  return displayName?.[0]?.toUpperCase() || "U";
}

/**
 * Get the first name from a display name (everything before the first space).
 * 
 * @param displayName - The user's display name
 * @returns The first name
 */
export function getFirstName(displayName: string): string {
  return displayName.split(" ")[0];
}
