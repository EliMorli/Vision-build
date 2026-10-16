import { AssistantProvider, AssistantMessage } from "./AssistantProvider";
import { supabase } from "@/lib/supabase";

/**
 * Real assistant provider that calls the server-side edge function
 */
export class RealAssistantProvider implements AssistantProvider {
  async chat(
    messages: AssistantMessage[],
    userMessage: string,
    attachedImages?: string[]
  ): Promise<AssistantMessage> {
    // Convert messages to conversation history format
    const conversationHistory = messages.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Call the edge function
    const { data, error } = await supabase.functions.invoke("assistant-chat", {
      body: {
        conversationHistory,
        userMessage,
      },
    });

    if (error) {
      throw new Error(`Assistant chat failed: ${error.message}`);
    }

    if (!data?.success || !data?.response) {
      throw new Error("Invalid response from assistant");
    }

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: data.response,
      timestamp: data.timestamp || Date.now(),
    };
  }

  async generateDesign(
    messages: AssistantMessage[],
    prompt: string
  ): Promise<AssistantMessage> {
    // For now, return a message indicating design generation
    // In a full implementation, this would trigger the generate-design edge function
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content:
        "I'd love to generate some designs for you! To do that, you'll need to create a project from the Projects tab and upload a room photo. Then I can help you visualize different styles!",
      timestamp: Date.now(),
    };
  }
}

export const realAssistantProvider = new RealAssistantProvider();
