import { create } from "zustand";
import { Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
import { Project, Profile, Contractor } from "./types";

// ─── Auth Store ────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,
  error: null,

  setSession: (session) => {
    set({ session, loading: false });
    if (session) get().fetchProfile();
  },

  fetchProfile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) set({ profile: data });
    if (error) console.warn("fetchProfile:", error.message);
  },

  signInWithOAuth: async (provider) => {
    set({ loading: true, error: null });

    try {
      const redirectUrl = makeRedirectUri({ scheme: "visionbuild", path: "auth/callback" });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });

      if (error) throw error;

      // Open the Supabase auth URL in the system browser
      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === "success" && result.url) {
          // Extract tokens from the redirect URL fragment
          const fragment = result.url.split("#")[1];
          if (fragment) {
            const params = new URLSearchParams(fragment);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { data: sessionData, error: sessionError } =
                await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

              if (sessionError) throw sessionError;
              set({ session: sessionData.session, loading: false });
              if (sessionData.session) get().fetchProfile();
              return;
            }
          }
        }
      }

      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));

// ─── Project Slice ─────────────────────────────────────────

// Cache for signed URLs (path -> { url, expiresAt })
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

async function getSignedUrl(bucket: string, path: string): Promise<string | null> {
  const cacheKey = `${bucket}:${path}`;
  const cached = signedUrlCache.get(cacheKey);
  
  // Re-use if cache is fresh (expires in > 5 minutes)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.url;
  }

  // Generate new signed URL (1 hour expiry)
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60); // 1 hour

  if (error || !data) {
    console.error("Failed to create signed URL:", error);
    return null;
  }

  // Cache it
  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + 60 * 60 * 1000,
  });

  return data.signedUrl;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;
  toggleProjectPrivacy: (projectId: string, isPublic: boolean) => Promise<void>;

  uploadAndAnalyze: (imageUri: string) => Promise<Project | null>;
  generateDesigns: (projectId: string, stylePrompt: string) => Promise<Project | null>;
  selectDesign: (projectId: string, url: string) => Promise<void>;
  refreshProjectUrls: (project: Project) => Promise<Project>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,
  progress: 0,
  progressMessage: "",
  error: null,

  fetchProjects: async () => {
    const userId = useAuthStore.getState().session?.user?.id;
    
    // Dev mode: Use mock projects if explicitly enabled
    if (!userId && __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      const mockProjects: Project[] = [
        {
          id: "mock-1",
          user_id: "mock-user",
          title: "Kitchen Renovation",
          original_image_url: "https://placehold.co/800x500/E0E0E0/808080?text=Kitchen+Before",
          room_analysis: {
            roomType: "kitchen",
            currentStyle: "traditional",
            estimatedSqFt: 150,
            keyElements: ["oak cabinets", "tile flooring", "fluorescent lighting"],
            rawAnalysis: "Mid-size kitchen with oak cabinetry and dated finishes",
          },
          selected_style: "modern",
          generated_image_urls: [
            "https://placehold.co/600x400/1A73E8/FFFFFF?text=Design+1",
            "https://placehold.co/600x400/34A853/FFFFFF?text=Design+2",
            "https://placehold.co/600x400/FBBC04/FFFFFF?text=Design+3",
            "https://placehold.co/600x400/EA4335/FFFFFF?text=Design+4",
          ],
          selected_generation_url: "https://placehold.co/600x400/1A73E8/FFFFFF?text=Design+1",
          status: "generated",
          lead_info: null,
          is_public: false,
          created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "mock-2",
          user_id: "mock-user",
          title: "Bathroom Remodel",
          original_image_url: "https://placehold.co/800x500/D0D0D0/707070?text=Bathroom+Before",
          room_analysis: {
            roomType: "bathroom",
            currentStyle: "dated",
            estimatedSqFt: 80,
            keyElements: ["small vanity", "old fixtures", "limited storage"],
            rawAnalysis: "Compact bathroom needing modernization",
          },
          selected_style: "coastal",
          generated_image_urls: [
            "https://placehold.co/600x400/3498DB/FFFFFF?text=Bath+1",
            "https://placehold.co/600x400/2ECC71/FFFFFF?text=Bath+2",
          ],
          selected_generation_url: null,
          status: "generated",
          lead_info: null,
          is_public: false,
          created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
        },
        {
          id: "mock-3",
          user_id: "mock-user",
          title: "Backyard Oasis",
          original_image_url: "https://placehold.co/800x500/C8E6C9/4CAF50?text=Backyard+Before",
          room_analysis: {
            roomType: "backyard",
            currentStyle: "basic",
            estimatedSqFt: 400,
            keyElements: ["grass", "fence", "patio slab"],
            rawAnalysis: "Large backyard with potential for landscaping",
          },
          selected_style: "luxury",
          generated_image_urls: [
            "https://placehold.co/600x400/8BC34A/FFFFFF?text=Yard+1",
            "https://placehold.co/600x400/4CAF50/FFFFFF?text=Yard+2",
            "https://placehold.co/600x400/66BB6A/FFFFFF?text=Yard+3",
          ],
          selected_generation_url: "https://placehold.co/600x400/8BC34A/FFFFFF?text=Yard+1",
          status: "generated",
          lead_info: null,
          is_public: true,
          created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ];
      set({ projects: mockProjects });
      return;
    }
    
    if (!userId) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (data) set({ projects: data });
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  toggleProjectPrivacy: async (projectId: string, isPublic: boolean) => {
    const userId = useAuthStore.getState().session?.user?.id;
    
    // Dev mode: Update mock projects
    if (!userId && __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === projectId ? { ...p, is_public: isPublic } : p
        ),
        currentProject:
          state.currentProject?.id === projectId
            ? { ...state.currentProject, is_public: isPublic }
            : state.currentProject,
      }));
      return;
    }

    if (!userId) return;

    // Call edge function to update visibility and handle file copies
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) return;

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/set-project-visibility`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ projectId, isPublic }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Failed to update project visibility:", errorData);
      return;
    }

    // Update local state
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId ? { ...p, is_public: isPublic } : p
      ),
      currentProject:
        state.currentProject?.id === projectId
          ? { ...state.currentProject, is_public: isPublic }
          : state.currentProject,
    }));
  },

  uploadAndAnalyze: async (imageUri: string) => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return null;

    set({ loading: true, progress: 0, progressMessage: "Uploading photo...", error: null });

    try {
      // 1. Strip EXIF/GPS data by re-encoding (client-side privacy)
      set({ progress: 0.1, progressMessage: "Processing image..." });
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 2048 } }], // Resize if needed, strips EXIF
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      // 2. Upload to Supabase Storage
      set({ progress: 0.15, progressMessage: "Uploading photo..." });
      const fileName = `${userId}/${Date.now()}.jpg`;
      const fileResponse = await fetch(manipResult.uri);
      const arrayBuffer = await fileResponse.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("room-photos")
        .upload(fileName, arrayBuffer, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      // 3. Generate signed URL (1 hour expiry)
      const signedUrl = await getSignedUrl("room-photos", fileName);
      if (!signedUrl) throw new Error("Failed to create signed URL");

      // 4. Call analyze-room Edge Function
      set({ progress: 0.5, progressMessage: "Analyzing your room..." });

      const { data: analysisData, error: fnError } = await supabase.functions.invoke(
        "analyze-room",
        { body: { imageUrl: signedUrl } }
      );

      if (fnError) throw fnError;

      // 5. Create project row (store path, not signed URL)
      set({ progress: 0.8, progressMessage: "Creating project..." });

      const roomType = analysisData?.analysis?.roomType ?? "room";
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert([{
          user_id: userId,
          title: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Renovation`,
          original_image_url: fileName, // Store path instead of signed URL
          room_analysis: analysisData?.analysis ?? null,
          status: "analyzed" as const,
          generated_image_urls: [],
        }] as any)
        .select()
        .single();

      if (insertError) throw insertError;

      set({
        currentProject: project,
        loading: false,
        progress: 1,
        progressMessage: "Done!",
      });
      get().fetchProjects();
      return project;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  generateDesigns: async (projectId: string, stylePrompt: string) => {
    set({ loading: true, progress: 0, progressMessage: "Generating designs...", error: null });

    try {
      set({ progress: 0.3 });

      const { data, error } = await supabase.functions.invoke("generate-design", {
        body: {
          projectId,
          stylePrompt,
          roomAnalysis: get().currentProject?.room_analysis?.rawAnalysis ?? "",
        },
      });

      if (error) throw error;

      set({ progress: 0.8, progressMessage: "Saving designs..." });

      // Refresh the project from DB
      const { data: updated } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (updated) {
        set({ currentProject: updated, loading: false, progress: 1 });
        get().fetchProjects();
        return updated;
      }
      return null;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return null;
    }
  },

  selectDesign: async (projectId: string, url: string) => {
    const { error } = await (supabase
      .from("projects") as any)
      .update({ selected_generation_url: url })
      .eq("id", projectId);

    if (!error) {
      const current = get().currentProject;
      if (current) {
        set({ currentProject: { ...current, selected_generation_url: url } });
      }
    }
  },

  refreshProjectUrls: async (project: Project): Promise<Project> => {
    // Re-sign all URLs in a project
    const refreshed = { ...project };

    if (refreshed.original_image_url) {
      const signedUrl = await getSignedUrl("room-photos", refreshed.original_image_url);
      if (signedUrl) refreshed.original_image_url = signedUrl;
    }

    if (refreshed.generated_image_urls && refreshed.generated_image_urls.length > 0) {
      refreshed.generated_image_urls = await Promise.all(
        refreshed.generated_image_urls.map(async (path) => {
          const signedUrl = await getSignedUrl("room-photos", path);
          return signedUrl || path;
        })
      );
    }

    if (refreshed.selected_generation_url) {
      const signedUrl = await getSignedUrl("room-photos", refreshed.selected_generation_url);
      if (signedUrl) refreshed.selected_generation_url = signedUrl;
    }

    return refreshed;
  },
}));

// ─── Lead Slice ────────────────────────────────────────────

interface LeadState {
  matchedContractors: Contractor[];
  emailPreview: { subject: string; body: string; scopeOfWork: string[] } | null;
  loading: boolean;
  progressMessage: string;
  error: string | null;

  generateBriefAndMatch: (params: {
    projectId: string;
    originalImageUrl: string;
    generatedImageUrl: string;
    zipCode: string;
    budgetRange: string;
    userName: string;
    roomType: string;
  }) => Promise<void>;

  dispatchLeads: (params: {
    projectId: string;
    zipCode: string;
    budgetRange: string;
  }) => Promise<boolean>;

  clear: () => void;
}

export const useLeadStore = create<LeadState>((set) => ({
  matchedContractors: [],
  emailPreview: null,
  loading: false,
  progressMessage: "",
  error: null,

  generateBriefAndMatch: async (params) => {
    set({ loading: true, progressMessage: "Generating project brief...", error: null });

    try {
      // Call dispatch-lead in preview mode
      const { data, error } = await supabase.functions.invoke("dispatch-lead", {
        body: { ...params, preview: true },
      });

      if (error) throw error;

      set({
        emailPreview: data?.email ?? null,
        matchedContractors: data?.contractors ?? [],
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  dispatchLeads: async (params) => {
    set({ loading: true, progressMessage: "Sending leads to contractors..." });

    try {
      const { error } = await supabase.functions.invoke("dispatch-lead", {
        body: { ...params, preview: false },
      });

      if (error) throw error;

      set({ loading: false, progressMessage: "Leads sent!" });
      return true;
    } catch (e: any) {
      set({ error: e.message, loading: false });
      return false;
    }
  },

  clear: () =>
    set({ matchedContractors: [], emailPreview: null, error: null }),
}));

// ─── Report Slice ──────────────────────────────────────────

interface ReportState {
  submitReport: (params: {
    targetType: "design" | "message" | "contractor";
    targetId: string;
    reason: string;
  }) => Promise<void>;
}

export const useReportStore = create<ReportState>(() => ({
  submitReport: async ({ targetType, targetId, reason }) => {
    const userId = useAuthStore.getState().session?.user?.id;

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      console.log("[Mock] Report submitted:", { targetType, targetId, reason, userId: userId || "mock-user" });
      return;
    }

    if (!userId) return;

    const { error } = await (supabase.from("reports") as any).insert([
      {
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        reason,
      },
    ]);

    if (error) {
      console.error("Failed to submit report:", error);
      throw error;
    }
  },
}));

// ─── Privacy Slice ─────────────────────────────────────────

interface PrivacyState {
  privacyOptOut: boolean;
  reduceMotion: boolean;
  loadPrivacySettings: () => Promise<void>;
  setPrivacyOptOut: (optOut: boolean) => Promise<void>;
  setReduceMotion: (reduce: boolean) => Promise<void>;
}

export const usePrivacyStore = create<PrivacyState>((set, get) => ({
  privacyOptOut: false,
  reduceMotion: false,

  loadPrivacySettings: async () => {
    const userId = useAuthStore.getState().session?.user?.id;

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      return;
    }

    if (!userId) return;

    const { data } = await (supabase
      .from("profiles") as any)
      .select("privacy_opt_out")
      .eq("id", userId)
      .single();

    if (data) {
      set({ privacyOptOut: data.privacy_opt_out ?? false });
    }
  },

  setPrivacyOptOut: async (optOut: boolean) => {
    const userId = useAuthStore.getState().session?.user?.id;

    if (__DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
      set({ privacyOptOut: optOut });
      return;
    }

    if (!userId) return;

    const { error } = await (supabase
      .from("profiles") as any)
      .update({ privacy_opt_out: optOut })
      .eq("id", userId);

    if (!error) {
      set({ privacyOptOut: optOut });
    }
  },

  setReduceMotion: async (reduce: boolean) => {
    set({ reduceMotion: reduce });
  },
}));
