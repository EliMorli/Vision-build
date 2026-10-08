// Shared module for user account deletion
// Used by both delete-account (authenticated) and confirm-account-deletion (token-based)

import { SignJWT } from "https://deno.land/x/jose@v5.2.0/index.ts";

export interface DeleteUserDataParams {
  userId: string;
  userEmail: string;
  userAppMetadata: any;
  userIdentities: any[];
  supabase: any; // Service role client
  appleAuthCode?: string; // Optional Apple authorization code for token revocation
}

export type AppleRevokeStatus = 
  | { status: 'success' }
  | { status: 'skipped'; reason: 'not_apple_user' | 'no_auth_code' | 'missing_credentials' }
  | { status: 'failed'; reason: 'token_exchange_failed' | 'revoke_failed'; errorCode?: string };

export type DeleteUserDataResult =
  | { success: true; appleRevokeStatus: AppleRevokeStatus }
  | { success: false; stage: 'storage' | 'database' | 'auth'; bucket?: string; error: string };

/**
 * Recursively delete all objects under a prefix in a storage bucket, with pagination.
 * Returns the total number of objects deleted, or throws on error.
 * 
 * Fixed pagination: tracks progress to prevent infinite loops on failed removes.
 */
async function deleteStoragePrefix(
  supabase: any,
  bucketId: string,
  prefix: string
): Promise<number> {
  let totalDeleted = 0;
  const pageSize = 1000;
  const maxAttempts = 100; // Cap attempts to prevent infinite loops
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    
    const { data: files, error } = await supabase.storage
      .from(bucketId)
      .list(prefix, { limit: pageSize, offset: 0 });

    if (error) {
      throw new Error(`Storage list error in ${bucketId}/${prefix}: ${error.message}`);
    }

    if (!files || files.length === 0) {
      break;
    }

    const filePaths: string[] = [];

    for (const file of files) {
      const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
      
      if (file.id === null) {
        const subCount = await deleteStoragePrefix(supabase, bucketId, fullPath);
        totalDeleted += subCount;
      } else {
        filePaths.push(fullPath);
      }
    }

    if (filePaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(bucketId)
        .remove(filePaths);

      if (removeError) {
        throw new Error(`Storage remove error in ${bucketId}: ${removeError.message}`);
      }
      
      totalDeleted += filePaths.length;
      console.log(`Deleted ${filePaths.length} object(s) from ${bucketId}/${prefix}`);
    }

    // If we got fewer files than the page size, we're done
    if (files.length < pageSize) {
      break;
    }
  }

  if (attempts >= maxAttempts) {
    throw new Error(`Storage deletion exceeded max attempts (${maxAttempts}) in ${bucketId}/${prefix}`);
  }

  return totalDeleted;
}

/**
 * Deletes all user data: storage, database rows, and auth account.
 * Also revokes Apple Sign-In token if applicable (but NEVER blocks deletion).
 * 
 * On storage or database errors, returns a typed failure WITHOUT deleting auth user.
 * This allows the caller to persist a retry record.
 */
export async function deleteUserData(params: DeleteUserDataParams): Promise<DeleteUserDataResult> {
  const { userId, userAppMetadata, userIdentities, supabase, appleAuthCode } = params;

  // ─── Delete storage objects ────────────────────────────
  // All storage buckets in the system (from migrations)
  const buckets = ['room-photos', 'public-designs'];
  
  try {
    for (const bucketId of buckets) {
      const deletedCount = await deleteStoragePrefix(supabase, bucketId, userId);
      if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} object(s) from ${bucketId}/${userId}`);
      }
    }

    // Also delete public-designs by projectId
    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    if (projects && projects.length > 0) {
      for (const project of projects) {
        const deletedCount = await deleteStoragePrefix(supabase, 'public-designs', project.id);
        if (deletedCount > 0) {
          console.log(`Deleted ${deletedCount} object(s) from public-designs/${project.id}`);
        }
      }
    }
  } catch (storageError: any) {
    // Extract bucket name from error if present
    const bucketMatch = storageError.message?.match(/in ([^/]+)\//);
    const bucket = bucketMatch ? bucketMatch[1] : undefined;
    
    console.error(`Storage deletion failed for user ${userId}: ${storageError.message}`);
    return {
      success: false,
      stage: 'storage',
      bucket,
      error: storageError.message
    };
  }

  // ─── Delete database rows ──────────────────────────────
  // RLS + cascade delete handles most of these automatically,
  // but we delete explicitly for clarity and logging

  try {
    await supabase.from("xp_events").delete().eq("user_id", userId);
    await supabase.from("leads").delete().eq("user_id", userId);
    await supabase.from("reports").delete().eq("user_id", userId);
    await supabase.from("consents").delete().eq("user_id", userId);
    await supabase.from("usage_events").delete().eq("user_id", userId);
    await supabase.from("account_deletion_requests").delete().eq("user_id", userId);
    await supabase.from("projects").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
  } catch (dbError: any) {
    console.error(`Database deletion failed for user ${userId}: ${dbError.message}`);
    return {
      success: false,
      stage: 'database',
      error: dbError.message
    };
  }

  // ─── Revoke Apple Sign-In token (if applicable) ────────
  // IMPORTANT: Apple revocation NEVER blocks deletion. The account is deleted regardless.

  let appleRevokeStatus: AppleRevokeStatus;

  const APPLE_TEAM_ID = Deno.env.get("APPLE_TEAM_ID");
  const APPLE_KEY_ID = Deno.env.get("APPLE_KEY_ID");
  const APPLE_PRIVATE_KEY = Deno.env.get("APPLE_PRIVATE_KEY");
  const APPLE_SERVICES_ID = Deno.env.get("APPLE_SERVICES_ID");

  const isAppleUser = userAppMetadata?.provider === "apple";

  if (!isAppleUser) {
    appleRevokeStatus = { status: 'skipped', reason: 'not_apple_user' };
  } else if (!appleAuthCode) {
    console.log(`Apple revocation skipped for user ${userId}: no authorization code provided (user may have cancelled)`);
    appleRevokeStatus = { status: 'skipped', reason: 'no_auth_code' };
  } else if (!APPLE_TEAM_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY || !APPLE_SERVICES_ID) {
    console.warn(
      `Apple revocation skipped for user ${userId}: missing credentials. ` +
      "Set APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, and APPLE_SERVICES_ID to enable."
    );
    appleRevokeStatus = { status: 'skipped', reason: 'missing_credentials' };
  } else {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      const pemKey = APPLE_PRIVATE_KEY
        .replace(/\\n/g, "\n")
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .trim();
      
      const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));
      
      const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["sign"]
      );

      const clientSecret = await new SignJWT({
        iss: APPLE_TEAM_ID,
        iat: now,
        exp: now + 3600,
        aud: "https://appleid.apple.com",
        sub: APPLE_SERVICES_ID,
      })
        .setProtectedHeader({ alg: "ES256", kid: APPLE_KEY_ID })
        .sign(privateKey);

      const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: APPLE_SERVICES_ID,
          client_secret: clientSecret,
          code: appleAuthCode,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        console.error(`Apple token exchange failed for user ${userId}: ${tokenRes.status}`);
        appleRevokeStatus = { status: 'failed', reason: 'token_exchange_failed', errorCode: String(tokenRes.status) };
      } else {
        const tokenData = await tokenRes.json();
        const refreshToken = tokenData.refresh_token;

        const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: APPLE_SERVICES_ID,
            client_secret: clientSecret,
            token: refreshToken,
            token_type_hint: "refresh_token",
          }),
        });

        if (!revokeRes.ok) {
          console.error(`Apple token revocation failed for user ${userId}: ${revokeRes.status}`);
          appleRevokeStatus = { status: 'failed', reason: 'revoke_failed', errorCode: String(revokeRes.status) };
        } else {
          console.log(`Apple token revoked successfully for user ${userId}`);
          appleRevokeStatus = { status: 'success' };
        }
      }
    } catch (appleErr: any) {
      console.error(`Apple revocation error for user ${userId}:`, appleErr.message);
      appleRevokeStatus = { status: 'failed', reason: 'token_exchange_failed' };
    }
  }

  // ─── Delete auth user ──────────────────────────────────

  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

  if (deleteError) {
    console.error(`Auth user deletion failed for user ${userId}: ${deleteError.message}`);
    return {
      success: false,
      stage: 'auth',
      error: deleteError.message
    };
  }

  console.log(`Successfully deleted account for user ${userId}`);
  return { success: true, appleRevokeStatus };
}
