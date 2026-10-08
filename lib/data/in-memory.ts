import { DataLayer } from "./index";

// Bundled placeholder image for mock mode
// In a real implementation, this would be a local asset
const MOCK_IMAGE_URL = "https://placehold.co/800x600/E8F5E9/4CAF50?text=Mock+Room+Design";

/**
 * In-memory mock implementation of the data layer
 * Used in development without Supabase connection
 */
export class InMemoryDataLayer implements DataLayer {
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    // In mock mode, return a placeholder image URL
    // This simulates what a real signed URL would look like
    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate network delay
    return MOCK_IMAGE_URL;
  }

  async analyzeRoom(imageUrl: string): Promise<any> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Return canned analysis data
    return {
      analysis: {
        roomType: "living room",
        currentStyle: "traditional",
        estimatedSqFt: 250,
        keyElements: ["sofa", "coffee table", "bookshelf", "rug"],
        rawAnalysis:
          "Cozy living room with traditional furniture and warm colors. Good natural lighting from windows.",
      },
    };
  }

  async generateDesigns(
    projectId: string,
    stylePrompt: string,
    roomAnalysis: string
  ): Promise<string[]> {
    // Simulate realistic generation time for testing
    // Long enough to see the generating screen with countdown (needs at least 2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Return mock storage paths (not URLs - the component will call getSignedUrl)
    return [
      `mock/${projectId}/design_1.png`,
      `mock/${projectId}/design_2.png`,
      `mock/${projectId}/design_3.png`,
      `mock/${projectId}/design_4.png`,
    ];
  }
}
