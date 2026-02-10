import { create } from "zustand";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { Project, Profile, Contractor, Lead, LeadInfo } from "./types";

// ─── Auth Slice ────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple") => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, loading: false });
    if (session) get().fetchProfile();
  },

  fetchProfile: async () => {
    const userId = get().session?.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) set({ profile: data });
  },

  signInWithOAuth: async (provider) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: "visionbuild://auth/callback" },
    });
    if (error) {
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));

// ─── Project Slice ─────────────────────────────────────────

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;

  fetchProjects: () => Promise<void>;
  setCurrentProject: (project: Project) => void;

  uploadAndAnalyze: (imageUri: string) => Promise<Project | null>;
  generateDesigns: (projectId: string, stylePrompt: string) => Promise<Project | null>;
  selectDesign: (projectId: string, url: string) => Promise<void>;
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
    if (!userId) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (data) set({ projects: data });
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  uploadAndAnalyze: async (imageUri: string) => {
    const userId = useAuthStore.getState().session?.user?.id;
    if (!userId) return null;

    set({ loading: true, progress: 0, progressMessage: "Uploading photo...", error: null });

    try {
      // 1. Upload to Supabase Storage
      set({ progress: 0.2 });
      const fileName = `${userId}/${Date.now()}.jpg`;
      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("room-photos")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("room-photos")
        .getPublicUrl(fileName);

      // 2. Call analyze-room Edge Function
      set({ progress: 0.5, progressMessage: "Analyzing your room..." });

      const { data: analysisData, error: fnError } = await supabase.functions.invoke(
        "analyze-room",
        { body: { imageUrl: urlData.publicUrl } }
      );

      if (fnError) throw fnError;

      // 3. Create project row
      set({ progress: 0.8, progressMessage: "Creating project..." });

      const roomType = analysisData?.analysis?.roomType ?? "room";
      const { data: project, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          title: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Renovation`,
          original_image_url: urlData.publicUrl,
          room_analysis: analysisData?.analysis ?? null,
          status: "analyzed" as const,
        })
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
    const { error } = await supabase
      .from("projects")
      .update({ selected_generation_url: url })
      .eq("id", projectId);

    if (!error) {
      const current = get().currentProject;
      if (current) {
        set({ currentProject: { ...current, selected_generation_url: url } });
      }
    }
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
