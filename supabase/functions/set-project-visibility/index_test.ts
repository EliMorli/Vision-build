import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { handleSetVisibility, SetVisibilityDeps } from "./index.ts";
import { DIGITAL_SOURCE_TYPE_AI, readDigitalSourceType, readPngChunks } from "../_shared/ai-provenance.ts";

// Helper to create fake deps
function createFakeDeps(overrides: Partial<SetVisibilityDeps> = {}): SetVisibilityDeps {
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": {},
    "public-designs": {},
  };
  
  const logMessages: string[] = [];
  const errorMessages: string[] = [];
  const warnMessages: string[] = [];
  
  return {
    supabase: {
      from: (table: string) => ({
        update: (data: any) => ({
          eq: () => ({ error: null })
        }),
      }),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            if (storage[bucket]?.[path]) {
              return { data: storage[bucket][path], error: null };
            }
            return { data: null, error: { message: `File not found: ${path}` } };
          },
          upload: async (path: string, data: Blob) => {
            if (!storage[bucket]) storage[bucket] = {};
            storage[bucket][path] = data;
            return { error: null };
          },
          remove: async (paths: string[]) => {
            for (const path of paths) {
              if (storage[bucket]?.[path]) {
                delete storage[bucket][path];
              }
            }
            return { error: null };
          },
        }),
      },
    },
    verifyAuth: async () => ({ anonClient: {}, userId: "user-123" }),
    verifyOwnership: async () => ({ project: {} }),
    logger: {
      log: (msg: string) => logMessages.push(msg),
      error: (msg: string, ...args: any[]) => errorMessages.push(`${msg} ${args.join(" ")}`),
      warn: (msg: string) => warnMessages.push(msg),
    },
    ...overrides,
  };
}

Deno.test("set-visibility: public copies only generated images, never original", async () => {
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": {
      "user-123/proj-456/original.jpg": new Blob(["original"]),
      "user-123/proj-456/design-0.png": new Blob(["design0"]),
      "user-123/proj-456/design-1.png": new Blob(["design1"]),
    },
    "public-designs": {},
  };
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            if (storage[bucket]?.[path]) {
              return { data: storage[bucket][path], error: null };
            }
            return { data: null, error: { message: `File not found: ${path}` } };
          },
          upload: async (path: string, data: Blob, _options: any) => {
            if (!storage[bucket]) storage[bucket] = {};
            storage[bucket][path] = data;
            return { error: null };
          },
          remove: async () => ({ error: null }),
        }),
      },
    },
  });
  
  const project = {
    original_image_url: "user-123/proj-456/original.jpg",
    generated_image_urls: [
      "user-123/proj-456/design-0.png",
      "user-123/proj-456/design-1.png",
    ],
    selected_generation_url: "user-123/proj-456/design-0.png",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    project,
    deps
  );
  
  assertEquals(response.status, 200);
  
  // Check that designs were copied to public-designs
  assertEquals(storage["public-designs"]["user-123/proj-456/design-0.png"] !== undefined, true);
  assertEquals(storage["public-designs"]["user-123/proj-456/design-1.png"] !== undefined, true);
  
  // Check that original was NOT copied
  assertEquals(storage["public-designs"]["user-123/proj-456/original.jpg"], undefined);
});

Deno.test("set-visibility: skips paths containing 'original'", async () => {
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": {
      "user-123/proj-456/original-photo.jpg": new Blob(["original"]),
      "user-123/proj-456/design-0.png": new Blob(["design0"]),
    },
    "public-designs": {},
  };
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            if (storage[bucket]?.[path]) {
              return { data: storage[bucket][path], error: null };
            }
            return { data: null, error: { message: `File not found: ${path}` } };
          },
          upload: async (path: string, data: Blob, _options: any) => {
            if (!storage[bucket]) storage[bucket] = {};
            storage[bucket][path] = data;
            return { error: null };
          },
          remove: async () => ({ error: null }),
        }),
      },
    },
  });
  
  const project = {
    original_image_url: "user-123/proj-456/original-photo.jpg",
    generated_image_urls: [
      "user-123/proj-456/design-0.png",
      "user-123/proj-456/original-attempt.png", // Contains 'original'
    ],
    selected_generation_url: "user-123/proj-456/design-0.png",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    project,
    deps
  );
  
  assertEquals(response.status, 200);
  
  // Only design-0 should be copied
  assertEquals(storage["public-designs"]["user-123/proj-456/design-0.png"] !== undefined, true);
  assertEquals(storage["public-designs"]["user-123/proj-456/original-attempt.png"], undefined);
  assertEquals(storage["public-designs"]["user-123/proj-456/original-photo.jpg"], undefined);
});

Deno.test("set-visibility: normalizes signed URLs to paths", async () => {
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": {
      "user-123/proj-456/design-0.png": new Blob(["design0"]),
    },
    "public-designs": {},
  };
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) => {
            if (storage[bucket]?.[path]) {
              return { data: storage[bucket][path], error: null };
            }
            return { data: null, error: { message: `File not found: ${path}` } };
          },
          upload: async (path: string, data: Blob, _options: any) => {
            if (!storage[bucket]) storage[bucket] = {};
            storage[bucket][path] = data;
            return { error: null };
          },
          remove: async () => ({ error: null }),
        }),
      },
    },
  });
  
  // Project has signed URLs instead of paths
  const project = {
    original_image_url: "user-123/proj-456/original.jpg",
    generated_image_urls: [
      "https://example.supabase.co/storage/v1/object/sign/room-photos/user-123/proj-456/design-0.png?token=abc123",
    ],
    selected_generation_url: "https://example.supabase.co/storage/v1/object/sign/room-photos/user-123/proj-456/design-0.png?token=xyz789",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    project,
    deps
  );
  
  assertEquals(response.status, 200);
  
  // Should extract path and copy successfully
  assertEquals(storage["public-designs"]["user-123/proj-456/design-0.png"] !== undefined, true);
});

Deno.test("set-visibility: failed download returns 500", async () => {
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: () => ({
          download: async () => ({
            data: null,
            error: { message: "File not found" },
          }),
          upload: async () => ({ error: null }),
          remove: async () => ({ error: null }),
        }),
      },
    },
  });
  
  const project = {
    original_image_url: "user-123/proj-456/original.jpg",
    generated_image_urls: ["user-123/proj-456/design-0.png"],
    selected_generation_url: "user-123/proj-456/design-0.png",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    project,
    deps
  );
  
  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Failed to make project public");
});

Deno.test("set-visibility: failed upload returns 500", async () => {
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: () => ({
          download: async () => ({
            data: new Blob(["test"]),
            error: null,
          }),
          upload: async () => ({
            error: { message: "Upload failed" },
          }),
          remove: async () => ({ error: null }),
        }),
      },
    },
  });
  
  const project = {
    original_image_url: "user-123/proj-456/original.jpg",
    generated_image_urls: ["user-123/proj-456/design-0.png"],
    selected_generation_url: "user-123/proj-456/design-0.png",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    project,
    deps
  );
  
  assertEquals(response.status, 500);
  const body = await response.json();
  assertEquals(body.error, "Failed to make project public");
});

Deno.test("set-visibility: private removes all copies including original", async () => {
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": {},
    "public-designs": {
      "user-123/proj-456/original.jpg": new Blob(["original"]),
      "user-123/proj-456/design-0.png": new Blob(["design0"]),
      "user-123/proj-456/design-1.png": new Blob(["design1"]),
    },
  };
  
  const removedPaths: string[] = [];
  
  const deps = createFakeDeps({
    supabase: {
      from: () => ({
        update: () => ({ eq: () => ({ error: null }) }),
      }),
      storage: {
        from: (bucket: string) => ({
          download: async () => ({ data: null, error: null }),
          upload: async () => ({ error: null }),
          remove: async (paths: string[]) => {
            removedPaths.push(...paths);
            for (const path of paths) {
              if (storage[bucket]?.[path]) {
                delete storage[bucket][path];
              }
            }
            return { error: null };
          },
        }),
      },
    },
  });
  
  const project = {
    original_image_url: "user-123/proj-456/original.jpg",
    generated_image_urls: [
      "user-123/proj-456/design-0.png",
      "user-123/proj-456/design-1.png",
    ],
    selected_generation_url: "user-123/proj-456/design-0.png",
  };
  
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: false },
    project,
    deps
  );
  
  assertEquals(response.status, 200);
  
  // All files should be removed
  assertEquals(removedPaths.includes("user-123/proj-456/design-0.png"), true);
  assertEquals(removedPaths.includes("user-123/proj-456/design-1.png"), true);
  assertEquals(removedPaths.includes("user-123/proj-456/original.jpg"), true);
  
  // Storage should be empty
  assertEquals(Object.keys(storage["public-designs"]).length, 0);
});

// ---- AI provenance tag on public copies ----

function storageDeps(storage: Record<string, Record<string, Blob>>, uploads: { path: string; contentType: string }[], warnings: string[]) {
  return createFakeDeps({
    supabase: {
      from: () => ({ update: () => ({ eq: () => ({ error: null }) }) }),
      storage: {
        from: (bucket: string) => ({
          download: async (path: string) =>
            storage[bucket]?.[path]
              ? { data: storage[bucket][path], error: null }
              : { data: null, error: { message: `File not found: ${path}` } },
          upload: async (path: string, data: Blob, options: { contentType: string }) => {
            storage[bucket][path] = data;
            uploads.push({ path, contentType: options.contentType });
            return { error: null };
          },
          remove: async () => ({ error: null }),
        }),
      },
    },
    logger: { log: () => {}, error: () => {}, warn: (m: string) => warnings.push(m) },
  });
}

Deno.test("set-visibility: public PNG copy carries the AI DigitalSourceType tag, pixels untouched", async () => {
  const png = await Deno.readFile(new URL("../_shared/__fixtures__/images/design.png", import.meta.url));
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": { "user-123/proj-456/design-0.png": new Blob([png], { type: "image/png" }) },
    "public-designs": {},
  };
  const uploads: { path: string; contentType: string }[] = [];
  const warnings: string[] = [];
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    { original_image_url: null, generated_image_urls: ["user-123/proj-456/design-0.png"], selected_generation_url: null },
    storageDeps(storage, uploads, warnings),
  );
  assertEquals(response.status, 200);
  const copy = new Uint8Array(await storage["public-designs"]["user-123/proj-456/design-0.png"].arrayBuffer());
  assertEquals(readDigitalSourceType(copy), DIGITAL_SOURCE_TYPE_AI);
  const idat = (b: Uint8Array) => readPngChunks(b).filter((c) => c.type === "IDAT").map((c) => Array.from(c.data)).flat();
  assertEquals(idat(copy), idat(png));
  assertEquals(uploads, [{ path: "user-123/proj-456/design-0.png", contentType: "image/png" }]);
  assertEquals(warnings, []);
  // The private original in room-photos is not modified
  assertEquals(new Uint8Array(await storage["room-photos"]["user-123/proj-456/design-0.png"].arrayBuffer()), png);
});

Deno.test("set-visibility: JPEG bytes saved under a .png name get tagged and the right content type", async () => {
  const jpg = await Deno.readFile(new URL("../_shared/__fixtures__/images/design.jpg", import.meta.url));
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": { "user-123/proj-456/design-1.png": new Blob([jpg], { type: "image/png" }) },
    "public-designs": {},
  };
  const uploads: { path: string; contentType: string }[] = [];
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    { original_image_url: null, generated_image_urls: ["user-123/proj-456/design-1.png"], selected_generation_url: null },
    storageDeps(storage, uploads, []),
  );
  assertEquals(response.status, 200);
  const copy = new Uint8Array(await storage["public-designs"]["user-123/proj-456/design-1.png"].arrayBuffer());
  assertEquals(readDigitalSourceType(copy), DIGITAL_SOURCE_TYPE_AI);
  assertEquals(uploads[0].contentType, "image/jpeg");
});

Deno.test("set-visibility: unknown format is copied unchanged and logged", async () => {
  const bytes = new TextEncoder().encode("GIF89a-not-a-supported-format");
  const storage: Record<string, Record<string, Blob>> = {
    "room-photos": { "user-123/proj-456/design-2.gif": new Blob([bytes], { type: "image/gif" }) },
    "public-designs": {},
  };
  const uploads: { path: string; contentType: string }[] = [];
  const warnings: string[] = [];
  const response = await handleSetVisibility(
    "user-123",
    { projectId: "proj-456", isPublic: true },
    { original_image_url: null, generated_image_urls: ["user-123/proj-456/design-2.gif"], selected_generation_url: null },
    storageDeps(storage, uploads, warnings),
  );
  assertEquals(response.status, 200);
  const copy = new Uint8Array(await storage["public-designs"]["user-123/proj-456/design-2.gif"].arrayBuffer());
  assertEquals(copy, bytes);
  assertEquals(uploads[0].contentType, "image/gif");
  assertEquals(warnings.length, 1);
  assertEquals(warnings[0].includes("without the AI metadata tag"), true);
});
