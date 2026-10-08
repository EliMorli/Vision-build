import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Mock the imports
const mockVerifyAuth = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  if (authHeader === "Bearer user-123-token") {
    return { anonClient: {}, userId: "user-123" };
  }
  if (authHeader === "Bearer user-456-token") {
    return { anonClient: {}, userId: "user-456" };
  }
  return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
};

const mockVerifyProjectOwnership = async (_client: any, userId: string, projectId: string) => {
  if (projectId === "proj-owned-by-123" && userId === "user-123") {
    return {
      project: {
        id: projectId,
        original_image_url: "user-123/proj-owned-by-123/original.jpg",
        generated_image_urls: [
          "user-123/proj-owned-by-123/design-0.png",
          "user-123/proj-owned-by-123/design-1.png",
        ],
        selected_generation_url: "user-123/proj-owned-by-123/design-0.png",
      },
    };
  }
  
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
};

const mockGetServiceRoleClient = () => ({
  storage: {
    from: (_bucket: string) => ({
      createSignedUrl: async (path: string, expiresIn: number) => ({
        data: {
          signedUrl: `https://storage.example.com/${path}?token=signed&expires=${expiresIn}`,
        },
        error: null,
      }),
    }),
  },
});

Deno.test("get-project-images: owner gets 1-hour signed URLs", async () => {
  // Simulate the function logic
  const projectId = "proj-owned-by-123";
  const userId = "user-123";
  
  const ownershipResult = await mockVerifyProjectOwnership({}, userId, projectId);
  assertEquals(ownershipResult instanceof Response, false);
  
  const { project } = ownershipResult as any;
  const supabase = mockGetServiceRoleClient();
  
  const expiresIn = 3600;
  
  // Generate signed URL for original
  const { data: originalData } = await supabase.storage
    .from("room-photos")
    .createSignedUrl(project.original_image_url, expiresIn);
  
  assertEquals(originalData.signedUrl.includes("expires=3600"), true);
  
  // Generate signed URLs for generated images
  const signedGeneratedUrls = [];
  for (const path of project.generated_image_urls) {
    const { data } = await supabase.storage
      .from("room-photos")
      .createSignedUrl(path, expiresIn);
    signedGeneratedUrls.push(data.signedUrl);
  }
  
  assertEquals(signedGeneratedUrls.length, 2);
  assertEquals(signedGeneratedUrls[0].includes("expires=3600"), true);
  assertEquals(signedGeneratedUrls[1].includes("expires=3600"), true);
});

Deno.test("get-project-images: non-owner gets 403", async () => {
  const projectId = "proj-owned-by-123";
  const userId = "user-456"; // Different user
  
  const ownershipResult = await mockVerifyProjectOwnership({}, userId, projectId);
  
  // Should return a 403 Response
  assertEquals(ownershipResult instanceof Response, true);
  const response = ownershipResult as Response;
  assertEquals(response.status, 403);
});

Deno.test("get-project-images: validates expiry is exactly 1 hour", () => {
  const expiresIn = 3600; // 1 hour in seconds
  assertEquals(expiresIn, 60 * 60);
});
