// Supabase Edge Function: admin-design-image
//
// Returns a short-lived signed URL for a reported design's image so a
// moderator can see it in the queue. Admin only: the caller's JWT must pass
// public.is_admin() (admins table or app_metadata.role = 'admin').
// Only generated designs are signed; never the original room photo.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyAuth, getServiceRoleClient } from "../_shared/auth.ts";

export const SIGNED_URL_SECONDS = 300;

export interface AdminImageDeps {
  verifyAuth: (req: Request) => Promise<{ anonClient: any; userId: string } | Response>;
  isAdmin: (anonClient: any) => Promise<boolean>;
  loadProject: (projectId: string) => Promise<{ selected_generation_url: string | null; original_image_url: string | null; is_public: boolean } | null>;
  sign: (bucket: string, path: string, seconds: number) => Promise<string | null>;
}

export function pickDesignPath(p: { selected_generation_url: string | null; original_image_url: string | null }): string | null {
  const path = p.selected_generation_url;
  if (!path || path === p.original_image_url || path.includes("original")) return null;
  return path.replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:sign|public)\/[^/]+\//, "").split("?")[0];
}

export async function handleAdminImage(req: Request, deps: AdminImageDeps): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await deps.verifyAuth(req);
  if (auth instanceof Response) return auth;
  if (!(await deps.isAdmin(auth.anonClient))) return json(403, { error: "forbidden" });

  let projectId: unknown;
  try { ({ projectId } = await req.json()); } catch { return json(400, { error: "invalid_json" }); }
  if (typeof projectId !== "string" || !/^[0-9a-f-]{36}$/i.test(projectId)) return json(400, { error: "invalid_project_id" });

  const project = await deps.loadProject(projectId);
  if (!project) return json(404, { error: "not_found" });
  const path = pickDesignPath(project);
  if (!path) return json(200, { url: null });

  // Public designs were copied to public-designs; hidden/unpublished ones live in room-photos.
  const url = (project.is_public ? await deps.sign("public-designs", path, SIGNED_URL_SECONDS) : null)
    ?? await deps.sign("room-photos", path, SIGNED_URL_SECONDS);
  return json(200, { url, expiresIn: SIGNED_URL_SECONDS });
}

if (import.meta.main) {
  serve((req) => {
    const service = getServiceRoleClient();
    return handleAdminImage(req, {
      verifyAuth,
      isAdmin: async (anonClient) => {
        const { data, error } = await anonClient.rpc("is_admin");
        return !error && data === true;
      },
      loadProject: async (id) => {
        const { data } = await service
          .from("projects")
          .select("selected_generation_url, original_image_url, is_public")
          .eq("id", id)
          .maybeSingle();
        return data ?? null;
      },
      sign: async (bucket, path, seconds) => {
        const { data, error } = await service.storage.from(bucket).createSignedUrl(path, seconds);
        return error || !data ? null : data.signedUrl;
      },
    });
  });
}
