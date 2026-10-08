import { supabase } from "../supabase";
import { DataLayer, UserSettings } from "./index";

export interface ConsentError extends Error {
  isConsentError: true;
  reason: "never" | "outdated";
  currentVersion: string;
}

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

    if (error) {
      // Check if this is a consent error
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error === "consent_required") {
            const consentError = new Error(
              "AI consent required"
            ) as ConsentError;
            consentError.isConsentError = true;
            consentError.reason = errorData.reason;
            consentError.currentVersion = errorData.current_version;
            throw consentError;
          }
        } catch (parseError) {
          // Not JSON or not a consent error, fall through
        }
      }
      throw error;
    }
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

    if (error) {
      // Check if this is a consent error
      if (error.message) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData.error === "consent_required") {
            const consentError = new Error(
              "AI consent required"
            ) as ConsentError;
            consentError.isConsentError = true;
            consentError.reason = errorData.reason;
            consentError.currentVersion = errorData.current_version;
            throw consentError;
          }
        } catch (parseError) {
          // Not JSON or not a consent error, fall through
        }
      }
      throw error;
    }
    return data?.generatedUrls || [];
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await (supabase
        .from("user_settings") as any)
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If no settings exist yet, return defaults
        if (error.code === "PGRST116") {
          return {
            pushNotifications: true,
            marketingEmails: false,
            publicProjectsDefault: false,
            reduceMotion: false,
          };
        }
        console.error("Error loading user settings:", error);
        return null;
      }

      return {
        pushNotifications: data.push_notifications ?? true,
        marketingEmails: data.marketing_emails ?? false,
        publicProjectsDefault: data.public_projects_default ?? false,
        reduceMotion: data.reduce_motion ?? false,
      };
    } catch (error) {
      console.error("Error in getUserSettings:", error);
      return null;
    }
  }

  async saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
    const { error } = await (supabase
      .from("user_settings") as any)
      .upsert({
        user_id: userId,
        push_notifications: settings.pushNotifications,
        marketing_emails: settings.marketingEmails,
        public_projects_default: settings.publicProjectsDefault,
        reduce_motion: settings.reduceMotion,
      }, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving user settings:", error);
      throw error;
    }
  }
}
