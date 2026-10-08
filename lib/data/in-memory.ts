import { DataLayer, UserSettings } from "./index";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AI_CONSENT_VERSION } from "../config";

// Bundled placeholder image for mock mode
// In a real implementation, this would be a local asset
const MOCK_IMAGE_URL = "https://placehold.co/800x600/E8F5E9/4CAF50?text=Mock+Room+Design";

// Store actual uploaded file URIs in mock mode (keyed by mock storage path)
const mockUploadedFiles = new Map<string, string>();

// Track signed URL request counts per path (for testing retry behavior)
const signedUrlRequestCounts = new Map<string, number>();

// Key for simulated consent version in localStorage (for mock mode)
const MOCK_CONSENT_VERSION_KEY = "@visionbuild:mock_consent_version";

// Key for user settings in localStorage (for mock mode)
const SETTINGS_STORAGE_KEY = "@visionbuild:user_settings:";

interface ConsentError extends Error {
  isConsentError: true;
  reason: "never" | "outdated";
  currentVersion: string;
}

/**
 * Check mock consent status (simulated for testing)
 * Only checks if mock consent version is explicitly set
 */
async function checkMockConsent(): Promise<void> {
  // Only check consent if mock consent version key exists
  // This maintains backward compatibility with existing tests
  const mockVersion = await AsyncStorage.getItem(MOCK_CONSENT_VERSION_KEY);
  
  // If key doesn't exist, skip consent check (backward compatible)
  if (mockVersion === null) {
    return;
  }
  
  // If key exists but is empty, treat as never consented
  if (!mockVersion || mockVersion === "") {
    const error = new Error("AI consent required") as ConsentError;
    error.isConsentError = true;
    error.reason = "never";
    error.currentVersion = AI_CONSENT_VERSION;
    throw error;
  }
  
  // If outdated version, return outdated
  if (mockVersion !== AI_CONSENT_VERSION) {
    const error = new Error("AI consent required") as ConsentError;
    error.isConsentError = true;
    error.reason = "outdated";
    error.currentVersion = AI_CONSENT_VERSION;
    throw error;
  }
  
  // Current version, allow operation
}

/**
 * In-memory mock implementation of the data layer
 * Used in development without Supabase connection
 */
export class InMemoryDataLayer implements DataLayer {
  // Store an uploaded file's actual URI for mock mode
  storeUploadedFile(path: string, actualUri: string) {
    mockUploadedFiles.set(path, actualUri);
  }

  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));
    
    // Track request count for this path
    const requestKey = `${bucket}:${path}`;
    const requestCount = (signedUrlRequestCounts.get(requestKey) || 0) + 1;
    signedUrlRequestCounts.set(requestKey, requestCount);
    
    // If this path has an actual uploaded file in mock mode, return that
    const actualUri = mockUploadedFiles.get(path);
    if (actualUri) {
      return actualUri;
    }
    
    // For design images in mock mode, return versioned URLs that tests can intercept
    if (path.includes('design_')) {
      // Return a URL with a version parameter that changes on each request
      // This allows tests to track retries and force failures on specific requests
      // Use relative path so it works regardless of the dev server port
      // Extract index from path like "mock/proj-123/design_0.png"
      const designNumber = path.match(/design_(\d+)/)?.[1] || '0';
      // Return SVG files which scale properly in React Native Web
      return `/__mock__/design_${designNumber}.svg?v=${requestCount}`;
    }
    
    // Default: return the placeholder
    return MOCK_IMAGE_URL;
  }

  async analyzeRoom(imageUrl: string): Promise<any> {
    // Check mock consent
    await checkMockConsent();
    
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
    // Check mock consent
    await checkMockConsent();
    
    // Simulate realistic generation time for testing
    // Long enough to see the generating screen with countdown (needs at least 2-3 seconds)
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Return mock storage paths (not URLs - the component will call getSignedUrl)
    return [
      `mock/${projectId}/design_0.png`,
      `mock/${projectId}/design_1.png`,
      `mock/${projectId}/design_2.png`,
      `mock/${projectId}/design_3.png`,
    ];
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY + userId);
      if (stored) {
        return JSON.parse(stored);
      }
      // Return defaults if not found
      return {
        pushNotifications: true,
        marketingEmails: false,
        publicProjectsDefault: false,
        reduceMotion: false,
      };
    } catch (error) {
      console.error("Error loading settings from AsyncStorage:", error);
      return null;
    }
  }

  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(
        SETTINGS_STORAGE_KEY + userId,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error("Error saving settings to AsyncStorage:", error);
      throw error;
    }
  }
}
