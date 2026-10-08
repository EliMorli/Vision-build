import { supabase } from "../supabase";
import { DataLayer } from "./index";

/**
 * Supabase implementation of the data layer
 */
export class SupabaseDataLayer implements DataLayer {
  async getSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number = 3600
  ): Promise<string | null> {
    try {
      // Check if path is already a full URL (legacy signed URLs)
      if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
      }

      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error("Error in getSignedUrl:", error);
      return null;
    }
  }

  async analyzeRoom(imageUrl: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke("analyze-room", {
      body: { imageUrl },
    });

    if (error) throw error;
    return data;
  }

  async generateDesigns(
    projectId: string,
    stylePrompt: string,
    roomAnalysis: string
  ): Promise<string[]> {
    const { data, error } = await supabase.functions.invoke("generate-design", {
      body: {
        projectId,
        stylePrompt,
        roomAnalysis,
      },
    });

    if (error) throw error;
    return data?.generatedUrls || [];
  }
}
