// Interface for swappable AI design assistant providers

export type MessageRole = "user" | "assistant" | "system";

export interface AssistantMessage {
  id: string;
  role: MessageRole;
  content: string;
  imageUrls?: string[]; // For images attached to messages or generated designs
  timestamp: number;
}

export interface AssistantProvider {
  /**
   * Send a message to the assistant and get a response
   * @param messages - Conversation history
   * @param userMessage - The new user message
   * @param attachedImages - Optional images the user uploaded
   * @returns The assistant's response
   */
  chat(
    messages: AssistantMessage[],
    userMessage: string,
    attachedImages?: string[]
  ): Promise<AssistantMessage>;

  /**
   * Request the assistant to generate design variations
   * @param messages - Conversation context
   * @param prompt - Specific generation request
   * @returns Message with generated design URLs
   */
  generateDesign(
    messages: AssistantMessage[],
    prompt: string
  ): Promise<AssistantMessage>;
}
