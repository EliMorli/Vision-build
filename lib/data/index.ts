/**
 * Data layer interface for VisionBuild
 * 
 * Provides an abstraction over Supabase operations, allowing for:
 * - In-memory mock implementation for testing without backend
 * - Real Supabase implementation for production
 */

export interface DataLayer {
  /**
   * Get a signed URL for a private storage path
   * @param bucket - Storage bucket name (e.g., "room-photos")
   * @param path - Storage path (e.g., "userId/projectId/original.jpg")
   * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL or null if error
   */
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string | null>;

  /**
   * Get room analysis from uploaded image
   * @param imageUrl - Signed URL of the uploaded image
   * @returns Analysis data
   */
  analyzeRoom(imageUrl: string): Promise<any>;

  /**
   * Generate design images
   * @param projectId - Project ID
   * @param stylePrompt - Style prompt for generation
   * @param roomAnalysis - Room analysis text
   * @returns Array of generated image storage paths
   */
  generateDesigns(
    projectId: string,
    stylePrompt: string,
    roomAnalysis: string
  ): Promise<string[]>;
}

/**
 * Get the active data layer implementation
 */
export function getDataLayer(): DataLayer {
  const isMockMode =
    __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true";

  if (isMockMode) {
    // Lazy load to avoid circular dependencies
    const { InMemoryDataLayer } = require("./in-memory");
    return new InMemoryDataLayer();
  } else {
    const { SupabaseDataLayer } = require("./supabase");
    return new SupabaseDataLayer();
  }
}
