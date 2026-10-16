// Shared AI client module for OpenRouter (OpenAI-compatible API)
// Configurable via environment variables to work with OpenRouter or OpenAI directly

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Get AI configuration from environment
 * Enforces OpenRouter-only in production for data privacy compliance
 * 
 * APP_ENV handling (fail-closed):
 * - "development" (case-insensitive) → allows Replicate/OpenAI direct
 * - "staging" (case-insensitive) → allows Replicate/OpenAI direct
 * - missing, "production", or any other value → production mode (OpenRouter only)
 * 
 * Test cases:
 * - undefined → production ✓
 * - "" → production ✓
 * - "production" → production ✓
 * - "PRODUCTION" → production ✓
 * - "development" → development ✓
 * - "DEVELOPMENT" → development ✓
 * - "staging" → staging ✓
 * - "STAGING" → staging ✓
 * - "garbage" → production ✓
 * - "prod" → production ✓
 */
function getAIConfig() {
  const appEnvRaw = Deno.env.get("APP_ENV") || "";
  const appEnv = appEnvRaw.toLowerCase();
  
  // Fail closed: only explicit "development" or "staging" unlock non-prod behavior
  const isProduction = appEnv !== "development" && appEnv !== "staging";
  
  // Check for mock mode (development ONLY with AI_MOCK=true)
  // Staging and production MUST use real OpenRouter
  const aiMockRaw = Deno.env.get("AI_MOCK") || "";
  const isDevelopment = appEnv === "development";
  const isMockMode = isDevelopment && aiMockRaw.toLowerCase() === "true";
  
  const baseUrl = Deno.env.get("AI_BASE_URL") || "https://openrouter.ai/api/v1";
  const apiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY") || "";
  
  const isOpenRouter = baseUrl.includes("openrouter.ai");
  
  // In production, only OpenRouter is allowed (for data privacy compliance)
  if (isProduction && !isOpenRouter) {
    throw new Error(
      "PRODUCTION ERROR: AI_BASE_URL must point to OpenRouter (https://openrouter.ai/api/v1). " +
      "Direct OpenAI/Anthropic access is not allowed in production due to data retention policies. " +
      "Set AI_BASE_URL=https://openrouter.ai/api/v1 or leave it unset to use the default."
    );
  }
  
  // Model defaults - OpenRouter model IDs (all on ZDR endpoint list)
  // IMPORTANT: These defaults MUST match lib/ai-models.json
  // The client consent screen derives provider names from this config.
  // scripts/check-zdr-models.mjs validates they stay in sync.
  
  // Vision: Need image understanding for room analysis
  const modelVision = Deno.env.get("AI_MODEL_VISION") || "google/gemini-2.5-pro";
  // Text: High-quality text generation for contractor emails
  const modelText = Deno.env.get("AI_MODEL_TEXT") || "anthropic/claude-sonnet-5.5";
  // Chat: Conversational AI for Vi assistant
  const modelChat = Deno.env.get("AI_MODEL_CHAT") || "anthropic/claude-sonnet-5.5";
  // Render preview: Fast single image for user iteration (Nano Banana 2)
  const modelRenderPreview = Deno.env.get("AI_MODEL_RENDER_PREVIEW") || "google/gemini-3.1-flash-image";
  // Render final: Full set of design images (Nano Banana 2)
  const modelRenderFinal = Deno.env.get("AI_MODEL_RENDER_FINAL") || "google/gemini-3.1-flash-image";
  
  return {
    baseUrl,
    apiKey,
    modelVision,
    modelText,
    modelChat,
    modelRenderPreview,
    modelRenderFinal,
    isOpenRouter,
    isProduction,
    isMockMode,
  };
}

/**
 * Build headers for AI requests
 * Includes OpenRouter-specific headers when using OpenRouter
 */
function buildHeaders(apiKey: string, isOpenRouter: boolean): Record<string, string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  
  if (isOpenRouter) {
    // OpenRouter recommended headers
    const siteUrl = Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "") || "https://visionbuild.app";
    headers["HTTP-Referer"] = siteUrl;
    headers["X-Title"] = "VisionBuild";
  }
  
  return headers;
}

/**
 * Call the AI chat completion API
 * Always enforces strict data privacy settings for OpenRouter
 */
export async function chatCompletion(
  messages: ChatMessage[],
  model: string,
  options: {
    maxTokens?: number;
    temperature?: number;
  } = {}
): Promise<string> {
  const config = getAIConfig();
  
  // MOCK MODE: Return fake responses when AI_MOCK=true in development
  if (config.isMockMode) {
    console.log("[AI MOCK MODE] Returning fake response for model:", model);
    const lastMessage = messages[messages.length - 1];
    const userContent = typeof lastMessage.content === "string" 
      ? lastMessage.content 
      : JSON.stringify(lastMessage.content);
    
    // Return appropriate mock based on content
    if (userContent.toLowerCase().includes("room") || userContent.toLowerCase().includes("image")) {
      return JSON.stringify({
        roomType: "kitchen",
        currentStyle: "traditional",
        squareFeet: 180,
        keyElements: ["oak cabinets", "tile floor", "1 window", "pendant lights"],
        rawAnalysis: "Cozy traditional kitchen with oak cabinets, white tile countertops, and warm lighting. Approximately 180 sq ft."
      });
    }
    
    return "This is a mock AI response for local development. Set APP_ENV=development and AI_MOCK=true to enable this mode.";
  }
  
  const body: any = {
    model,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  };
  
  // ALWAYS add OpenRouter-specific privacy parameters when using OpenRouter
  // These are hardcoded to ensure compliance and cannot be overridden
  if (config.isOpenRouter) {
    body.provider = {
      // Only use providers that don't keep or train on data
      data_collection: "deny",
      // Enable Zero Data Retention mode
      zdr: true,
      // Don't fall back to non-compliant providers
      allow_fallbacks: false,
    };
  }
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(config.apiKey, config.isOpenRouter),
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    
    // Check if this is a "no compliant provider available" error
    if (config.isOpenRouter && response.status >= 400) {
      throw new Error(
        `No AI providers available that meet our strict privacy requirements (no data collection or training). ` +
        `This request cannot be completed at this time. Please try again later. (${response.status})`
      );
    }
    
    throw new Error(`AI API error (${response.status}): ${error}`);
  }
  
  const data: ChatCompletionResponse = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Analyze a room image
 * Uses vision model to analyze room photos and return structured data
 */
export async function analyzeRoom(imageUrl: string): Promise<any> {
  const config = getAIConfig();
  
  const prompt = `You are an expert interior designer and construction analyst. Analyze the provided room photo and return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:

{
  "roomType": "kitchen|bathroom|bedroom|living_room|dining_room|office|other",
  "currentStyle": "a short style description, e.g. dated oak traditional",
  "estimatedSqFt": 150,
  "keyElements": ["oak cabinets", "tile flooring", "fluorescent lighting"],
  "rawAnalysis": "A 2-3 sentence human-readable summary of what you see."
}

Be specific about materials, finishes, and notable features. Estimate square footage based on visual cues.`;

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: imageUrl } },
      ],
    },
  ];
  
  const text = await chatCompletion(messages, config.modelVision, {
    maxTokens: 800,
  });
  
  // Parse the JSON response
  try {
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback if parsing fails
    return {
      roomType: "other",
      currentStyle: "unknown",
      estimatedSqFt: 0,
      keyElements: [],
      rawAnalysis: text,
    };
  }
}

/**
 * Generate project brief and contractor email
 * Uses text model for structured text generation
 */
export async function generateProjectBrief(params: {
  originalImageUrl?: string;
  generatedImageUrl?: string;
  roomType: string;
  zipCode: string;
  budgetRange: string;
  userName: string;
  contactInfo?: string;
}): Promise<{
  subject: string;
  scopeOfWork: string[];
  projectType: string;
  body: string;
}> {
  const config = getAIConfig();
  
  const contactBlock = params.contactInfo ? `\n\n${params.contactInfo}` : "";
  
  const emailPrompt = `You are an expert construction project manager. You will receive two images:
"Current State" (Image A) and "Goal State" (Image B).

1. Compare the images. Identify the specific work required to transform from State A to State B.
2. Do NOT suggest structural changes (moving walls) unless the difference obviously requires it.
3. Draft a high-conversion email to a contractor that summarizes this job professionally.

Return ONLY valid JSON (no markdown):
{
  "subject": "New Lead: ${params.roomType} Remodel in ${params.zipCode} - Budget ${params.budgetRange}",
  "scopeOfWork": ["Flooring: Replace tile with hardwood/LVP", "Cabinets: Reface existing layout"],
  "projectType": "Kitchen Modernization",
  "body": "Full professional email body as a string."
}

Client: Zip: ${params.zipCode}, Budget: ${params.budgetRange}, Room: ${params.roomType}, Timeline: Flexible${contactBlock}`;

  const messageContent: any[] = [
    { type: "text", text: emailPrompt },
  ];
  
  // Attach images if available
  if (params.originalImageUrl) {
    messageContent.push(
      { type: "text", text: "Image A — Current State:" },
      { type: "image_url", image_url: { url: params.originalImageUrl } }
    );
  }
  if (params.generatedImageUrl) {
    messageContent.push(
      { type: "text", text: "Image B — Goal State:" },
      { type: "image_url", image_url: { url: params.generatedImageUrl } }
    );
  }
  
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: messageContent,
    },
  ];
  
  // Use vision model if images are provided, otherwise text model
  const model = (params.originalImageUrl || params.generatedImageUrl) 
    ? config.modelVision 
    : config.modelText;
  
  const text = await chatCompletion(messages, model, {
    maxTokens: 1200,
  });
  
  // Parse the JSON response
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    // Fallback if parsing fails
    return {
      subject: `New Renovation Lead in ${params.zipCode}`,
      scopeOfWork: [],
      projectType: "Renovation",
      body: text,
    };
  }
}

/**
 * Chat with Vi assistant
 * Uses chat model for conversational responses
 */
export async function viChat(
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string,
  systemPrompt?: string
): Promise<string> {
  const config = getAIConfig();
  
  const messages: ChatMessage[] = [];
  
  // Add system prompt if provided
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  } else {
    // Default Vi personality
    messages.push({
      role: "system",
      content: `You are Vi, a friendly and knowledgeable interior design assistant for VisionBuild. You help users explore room redesign ideas, suggest styles, colors, and materials. You're enthusiastic but professional, and you guide users toward generating visual designs they'll love. Keep responses concise (2-3 sentences usually) unless the user asks for detailed advice.`,
    });
  }
  
  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }
  
  // Add new user message
  messages.push({
    role: "user",
    content: userMessage,
  });
  
  return await chatCompletion(messages, config.modelChat, {
    maxTokens: 500,
    temperature: 0.7,
  });
}
