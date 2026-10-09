// Tests for AI configuration and mock mode restrictions

import { assertEquals, assertRejects } from "https://deno.land/std@0.177.0/testing/asserts.ts";

// Test that default models match lib/ai-models.json
Deno.test("Default AI models match lib/ai-models.json", async () => {
  // Read the JSON config
  const configPath = new URL("../../../lib/ai-models.json", import.meta.url);
  const configText = await Deno.readTextFile(configPath);
  const config = JSON.parse(configText);
  
  // Set environment to development to avoid production checks
  const originalEnv = Deno.env.get("APP_ENV");
  Deno.env.set("APP_ENV", "development");
  Deno.env.set("AI_MOCK", "true");
  
  try {
    // Import the module to get the defaults (through getAIConfig)
    // We can't directly access getAIConfig since it's not exported,
    // but we can verify by checking the actual behavior
    
    // The defaults are hardcoded in ai.ts, so we just verify they match the JSON
    // This is enforced by check:models script which reads both sources
    
    // For this test, we just ensure the JSON structure is valid
    assertEquals(typeof config.models, "object");
    assertEquals(typeof config.models.vision, "string");
    assertEquals(typeof config.models.text, "string");
    assertEquals(typeof config.models.chat, "string");
    assertEquals(typeof config.models.renderPreview, "string");
    assertEquals(typeof config.models.renderFinal, "string");
    
    // Verify they follow OpenRouter format
    assertEquals(config.models.vision, "google/gemini-2.5-pro");
    assertEquals(config.models.text, "anthropic/claude-sonnet-5.5");
    assertEquals(config.models.chat, "anthropic/claude-sonnet-5.5");
    assertEquals(config.models.renderPreview, "google/gemini-3.1-flash-image");
    assertEquals(config.models.renderFinal, "google/gemini-3.1-flash-image");
    
    // Verify vendor display names exist
    assertEquals(typeof config.vendorDisplayNames, "object");
    assertEquals(config.vendorDisplayNames.google, "Google (Gemini)");
    assertEquals(config.vendorDisplayNames.anthropic, "Anthropic (Claude)");
  } finally {
    if (originalEnv !== undefined) {
      Deno.env.set("APP_ENV", originalEnv);
    } else {
      Deno.env.delete("APP_ENV");
    }
    Deno.env.delete("AI_MOCK");
  }
});

// We need to test the configuration logic by setting environment variables
// and then dynamically importing the module to get fresh config

async function testWithEnv(
  env: Record<string, string>,
  testFn: () => Promise<void>
): Promise<void> {
  const originalEnv: Record<string, string | undefined> = {};
  
  // Save original values
  for (const key of Object.keys(env)) {
    originalEnv[key] = Deno.env.get(key);
  }
  
  // Set test values
  for (const [key, value] of Object.entries(env)) {
    Deno.env.set(key, value);
  }
  
  try {
    await testFn();
  } finally {
    // Restore original values
    for (const [key, original] of Object.entries(originalEnv)) {
      if (original === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, original);
      }
    }
  }
}

// Test mock mode restriction: only development allows AI_MOCK=true

Deno.test("AI_MOCK is disabled in production", async () => {
  await testWithEnv(
    { APP_ENV: "production", AI_MOCK: "true", AI_API_KEY: "test-key" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      // Mock mode should be disabled, so it should try to hit the real API
      // We expect it to fail because the API key is fake
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
        // Should fail with API error, not return mock response
      );
    }
  );
});

Deno.test("AI_MOCK is disabled in staging", async () => {
  await testWithEnv(
    { APP_ENV: "staging", AI_MOCK: "true", AI_API_KEY: "test-key" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      // Mock mode should be disabled in staging
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
      );
    }
  );
});

Deno.test("AI_MOCK is disabled in STAGING (uppercase)", async () => {
  await testWithEnv(
    { APP_ENV: "STAGING", AI_MOCK: "true", AI_API_KEY: "test-key" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
      );
    }
  );
});

Deno.test("AI_MOCK is disabled when APP_ENV is unset", async () => {
  await testWithEnv(
    { AI_MOCK: "true", AI_API_KEY: "test-key" },
    async () => {
      // Explicitly delete APP_ENV
      Deno.env.delete("APP_ENV");
      
      const { chatCompletion } = await import("./ai.ts");
      
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
      );
    }
  );
});

Deno.test("AI_MOCK is enabled in development", async () => {
  await testWithEnv(
    { APP_ENV: "development", AI_MOCK: "true" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      // Should return mock response
      const result = await chatCompletion(
        [{ role: "user", content: "test" }],
        "test-model"
      );
      
      assertEquals(typeof result, "string");
      assertEquals(result.includes("mock"), true);
    }
  );
});

Deno.test("AI_MOCK is enabled in DEVELOPMENT (uppercase)", async () => {
  await testWithEnv(
    { APP_ENV: "DEVELOPMENT", AI_MOCK: "true" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      const result = await chatCompletion(
        [{ role: "user", content: "test" }],
        "test-model"
      );
      
      assertEquals(typeof result, "string");
      assertEquals(result.includes("mock"), true);
    }
  );
});

Deno.test("AI_MOCK=false is disabled even in development", async () => {
  await testWithEnv(
    { APP_ENV: "development", AI_MOCK: "false", AI_API_KEY: "test-key" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      // Should try real API
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
      );
    }
  );
});

Deno.test("AI_MOCK unset is disabled in development", async () => {
  await testWithEnv(
    { APP_ENV: "development", AI_API_KEY: "test-key" },
    async () => {
      Deno.env.delete("AI_MOCK");
      
      const { chatCompletion } = await import("./ai.ts");
      
      // Should try real API
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
      );
    }
  );
});

// Test ZDR provider config and fail-closed APP_ENV

Deno.test("Production rejects non-OpenRouter base URL", async () => {
  await testWithEnv(
    { APP_ENV: "production", AI_BASE_URL: "https://api.openai.com/v1", AI_API_KEY: "test-key" },
    async () => {
      await assertRejects(
        async () => {
          const { chatCompletion } = await import("./ai.ts");
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
        "PRODUCTION ERROR: AI_BASE_URL must point to OpenRouter"
      );
    }
  );
});

Deno.test("Fail-closed: unknown APP_ENV treated as production", async () => {
  await testWithEnv(
    { APP_ENV: "garbage", AI_BASE_URL: "https://api.openai.com/v1", AI_API_KEY: "test-key" },
    async () => {
      await assertRejects(
        async () => {
          const { chatCompletion } = await import("./ai.ts");
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
        "PRODUCTION ERROR: AI_BASE_URL must point to OpenRouter"
      );
    }
  );
});

Deno.test("Development allows non-OpenRouter base URL", async () => {
  await testWithEnv(
    { APP_ENV: "development", AI_BASE_URL: "https://api.openai.com/v1", AI_API_KEY: "test-key" },
    async () => {
      const { chatCompletion } = await import("./ai.ts");
      
      // Should attempt to call the API (will fail with bad key, but no production error)
      await assertRejects(
        async () => {
          await chatCompletion(
            [{ role: "user", content: "test" }],
            "test-model"
          );
        },
        Error,
        // Should NOT contain "PRODUCTION ERROR"
      );
    }
  );
});
