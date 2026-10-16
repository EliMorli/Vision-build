import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { AdminImageDeps, handleAdminImage, pickDesignPath } from "./index.ts";

const PID = "d1000000-0000-0000-0000-000000000000";
function deps(admin: boolean, signed: string[] = []): AdminImageDeps {
  return {
    verifyAuth: async () => ({ anonClient: {}, userId: "u" }),
    isAdmin: async () => admin,
    loadProject: async (id) => id === PID
      ? { selected_generation_url: "u/p/gen-1.png", original_image_url: "u/p/original.jpg", is_public: false }
      : null,
    sign: async (bucket, path) => { signed.push(`${bucket}:${path}`); return `https://signed/${bucket}/${path}`; },
  };
}
const req = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

Deno.test("admin-image: non-admin is refused and nothing is signed", async () => {
  const signed: string[] = [];
  const res = await handleAdminImage(req({ projectId: PID }), deps(false, signed));
  assertEquals(res.status, 403);
  assertEquals(signed.length, 0);
});

Deno.test("admin-image: admin gets a signed generated image", async () => {
  const signed: string[] = [];
  const res = await handleAdminImage(req({ projectId: PID }), deps(true, signed));
  assertEquals(res.status, 200);
  assertEquals(signed, ["room-photos:u/p/gen-1.png"]);
});

Deno.test("admin-image: never signs the original room photo", () => {
  assertEquals(pickDesignPath({ selected_generation_url: "u/p/original.jpg", original_image_url: "u/p/original.jpg" }), null);
  assertEquals(pickDesignPath({ selected_generation_url: null, original_image_url: "x" }), null);
});

Deno.test("admin-image: bad id / unknown project", async () => {
  assertEquals((await handleAdminImage(req({ projectId: "x" }), deps(true))).status, 400);
  assertEquals((await handleAdminImage(req({ projectId: "e1000000-0000-0000-0000-000000000000" }), deps(true))).status, 404);
});
