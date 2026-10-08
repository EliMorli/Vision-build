import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Test the maskEmail function (extracted for testing)
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}•••@${domain}`;
  }
  return `${local[0]}•••@${domain}`;
}

Deno.test("maskEmail - masks standard email", () => {
  const result = maskEmail("john@example.com");
  assertEquals(result, "j•••@example.com");
});

Deno.test("maskEmail - masks short local part", () => {
  const result = maskEmail("ab@example.com");
  assertEquals(result, "a•••@example.com");
});

Deno.test("maskEmail - masks single char local part", () => {
  const result = maskEmail("a@example.com");
  assertEquals(result, "a•••@example.com");
});
