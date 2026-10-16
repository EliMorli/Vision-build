import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface AuthContext {
  userId: string;
  supabase: SupabaseClient;
}

/**
 * Verify the caller's JWT and return an authenticated Supabase client.
 * Returns 401 if no auth token or invalid.
 */
export async function verifyAuth(req: Request): Promise<{ userId: string; anonClient: SupabaseClient } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: { user }, error } = await anonClient.auth.getUser();

  if (error || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  return { userId: user.id, anonClient };
}

/**
 * Verify the caller owns the specified project.
 * Returns 403 if not authorized, 404 if project not found.
 */
export async function verifyProjectOwnership(
  anonClient: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ project: any } | Response> {
  const { data: project, error } = await anonClient
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !project) {
    return new Response(
      JSON.stringify({ error: "Project not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  if (project.user_id !== userId) {
    return new Response(
      JSON.stringify({ error: "Forbidden: You do not own this project" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return { project };
}

/**
 * Get a service-role client (only use after auth verification).
 */
export function getServiceRoleClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
