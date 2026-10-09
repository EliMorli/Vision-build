import { AssistantProvider, AssistantMessage } from "./AssistantProvider";

const CANNED_RESPONSES = [
  "I love helping with room redesigns! Tell me about the space you're working on. What room is it, and what style are you drawn to?",
  "That sounds like a great project! Would you like me to suggest some color palettes and materials that would work well?",
  "I can definitely help with that. Let me generate some design options for you to review.",
  "Those are excellent choices! The warm tones will really brighten up the space. Want to see what it could look like?",
  "I've generated a few variations for you. Take a look and let me know if you'd like me to adjust anything - warmer, cooler, more modern, etc.",
  "Great eye! That floor would pair beautifully with the rest of the design. Would you like to see more options in this direction?",
  "I think we're getting close to something you'll love! Should we refine this further or explore a different style direction?",
];

/**
 * Mock assistant provider with canned responses
 * Simulates a conversation flow with placeholder replies
 */
export class MockAssistantProvider implements AssistantProvider {
  private responseIndex = 0;

  async chat(
    messages: AssistantMessage[],
    userMessage: string,
    attachedImages?: string[]
  ): Promise<AssistantMessage> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const response = CANNED_RESPONSES[this.responseIndex % CANNED_RESPONSES.length];
    this.responseIndex++;

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: response,
      timestamp: Date.now(),
    };
  }

  async generateDesign(
    messages: AssistantMessage[],
    prompt: string
  ): Promise<AssistantMessage> {
    // Simulate generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate mock design URLs
    const colors = ["1A73E8", "34A853", "FBBC04", "EA4335"];
    const designCount = Math.floor(Math.random() * 2) + 2; // 2-3 designs
    const imageUrls = Array.from({ length: designCount }, (_, i) => {
      const color = colors[i % colors.length];
      return `https://placehold.co/600x400/${color}/FFFFFF?text=Design+${i + 1}`;
    });

    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "assistant",
      content: "Here are some design options based on what we discussed. Tap any image to see it full-screen, or let me know what you'd like to change!",
      imageUrls,
      timestamp: Date.now(),
    };
  }
}

export const mockAssistantProvider = new MockAssistantProvider();
