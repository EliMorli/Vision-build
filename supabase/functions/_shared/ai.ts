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
 */
function getAIConfig() {
  const baseUrl = Deno.env.get("AI_BASE_URL") || "https://openrouter.ai/api/v1";
  const apiKey = Deno.env.get("AI_API_KEY") || Deno.env.get("OPENAI_API_KEY") || "";
  
  // Model defaults - OpenRouter model IDs
  const modelVision = Deno.env.get("AI_MODEL_VISION") || "openai/gpt-4o-2024-11-20";
  const modelText = Deno.env.get("AI_MODEL_TEXT") || "anthropic/claude-3.5-sonnet";
  const modelChat = Deno.env.get("AI_MODEL_CHAT") || "anthropic/claude-3.5-sonnet";
  
  const isOpenRouter = baseUrl.includes("openrouter.ai");
  
  return {
    baseUrl,
    apiKey,
    modelVision,
    modelText,
    modelChat,
    isOpenRouter,
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
  
  const body: any = {
    model,
    messages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
  };
  
  // Add OpenRouter-specific request parameters
  if (config.isOpenRouter) {
    body.provider = {
      // Request providers that don't collect or train on data
      data_collection: "deny",
    };
  }
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(config.apiKey, config.isOpenRouter),
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
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
