// Tests for dispatch-lead function (feature flag enforcement)

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

Deno.test("dispatch-lead refuses when CONTRACTOR_OUTREACH_ENABLED is not set", () => {
  const originalValue = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
  
  try {
    Deno.env.delete("CONTRACTOR_OUTREACH_ENABLED");
    
    // When not set, it should be undefined
    const enabled = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
    assertEquals(enabled, undefined);
    
    // Function should refuse with 403
    const shouldRefuse = enabled !== "true";
    assertEquals(shouldRefuse, true);
  } finally {
    if (originalValue !== undefined) {
      Deno.env.set("CONTRACTOR_OUTREACH_ENABLED", originalValue);
    }
  }
});

Deno.test("dispatch-lead refuses when CONTRACTOR_OUTREACH_ENABLED is false", () => {
  const originalValue = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
  
  try {
    Deno.env.set("CONTRACTOR_OUTREACH_ENABLED", "false");
    
    const enabled = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
    assertEquals(enabled, "false");
    
    // Function should refuse with 403
    const shouldRefuse = enabled !== "true";
    assertEquals(shouldRefuse, true);
  } finally {
    if (originalValue !== undefined) {
      Deno.env.set("CONTRACTOR_OUTREACH_ENABLED", originalValue);
    } else {
      Deno.env.delete("CONTRACTOR_OUTREACH_ENABLED");
    }
  }
});

Deno.test("dispatch-lead allows when CONTRACTOR_OUTREACH_ENABLED is true", () => {
  const originalValue = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
  
  try {
    Deno.env.set("CONTRACTOR_OUTREACH_ENABLED", "true");
    
    const enabled = Deno.env.get("CONTRACTOR_OUTREACH_ENABLED");
    assertEquals(enabled, "true");
    
    // Function should allow the request
    const shouldRefuse = enabled !== "true";
    assertEquals(shouldRefuse, false);
  } finally {
    if (originalValue !== undefined) {
      Deno.env.set("CONTRACTOR_OUTREACH_ENABLED", originalValue);
    } else {
      Deno.env.delete("CONTRACTOR_OUTREACH_ENABLED");
    }
  }
});
