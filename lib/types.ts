// ─── Database types (mirrors the Supabase schema) ──────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "last_login_at">;
        Update: Partial<Profile>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at">;
        Update: Partial<Project>;
      };
      contractors: {
        Row: Contractor;
        Insert: Omit<Contractor, "id" | "created_at">;
        Update: Partial<Contractor>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, "id" | "created_at">;
        Update: Partial<Lead>;
      };
    };
  };
};

// ─── Row types ─────────────────────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  photo_url: string | null;
  created_at: string;
  last_login_at: string;
}

export type ProjectStatus =
  | "draft"
  | "analyzed"
  | "generated"
  | "connected"
  | "completed";

export interface RoomAnalysis {
  roomType: string;
  currentStyle: string;
  estimatedSqFt: number;
  keyElements: string[];
  rawAnalysis: string;
}

export interface LeadInfo {
  budgetRange: string;
  zipCode: string;
  projectBrief: string | null;
  matchedContractorIds: string[];
  submittedAt: string | null;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  original_image_url: string;
  room_analysis: RoomAnalysis | null;
  selected_style: string | null;
  generated_image_urls: string[];
  selected_generation_url: string | null;
  status: ProjectStatus;
  lead_info: LeadInfo | null;
  created_at: string;
  updated_at: string;
}

export interface Contractor {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  zip_code: string;
  city: string;
  state: string;
  specialties: string[];
  rating: number;
  completed_jobs: number;
  is_active: boolean;
  created_at: string;
}

export type LeadStatus =
  | "pending"
  | "sent"
  | "viewed"
  | "accepted"
  | "declined"
  | "completed";

export interface Lead {
  id: string;
  project_id: string;
  user_id: string;
  contractor_id: string;
  email_subject: string;
  email_body: string;
  original_image_url: string;
  generated_image_url: string;
  budget_range: string;
  zip_code: string;
  scope_of_work: string[];
  status: LeadStatus;
  created_at: string;
  responded_at: string | null;
}

// ─── Style presets ─────────────────────────────────────────

export interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon: string; // Ionicons name
  promptModifier: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean lines, neutral tones, minimalist",
    icon: "cube-outline",
    promptModifier:
      "modern minimalist style with clean lines, neutral palette, matte finishes, and contemporary fixtures",
  },
  {
    id: "industrial",
    name: "Industrial",
    description: "Exposed brick, metal accents, raw materials",
    icon: "construct-outline",
    promptModifier:
      "industrial loft style with exposed brick, metal accents, Edison bulbs, concrete surfaces",
  },
  {
    id: "farmhouse",
    name: "Farmhouse",
    description: "Warm wood, shiplap, rustic charm",
    icon: "home-outline",
    promptModifier:
      "modern farmhouse style with shiplap walls, warm wood tones, apron-front sink, rustic hardware",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Light blues, whites, natural textures",
    icon: "water-outline",
    promptModifier:
      "coastal style with light blue and white palette, natural woven textures, driftwood accents",
  },
  {
    id: "midcentury",
    name: "Mid-Century",
    description: "Retro meets contemporary, organic curves",
    icon: "ellipse-outline",
    promptModifier:
      "mid-century modern style with organic curves, warm wood, bold accent colors, tapered legs",
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Light, airy, functional simplicity",
    icon: "snow-outline",
    promptModifier:
      "Scandinavian style with light wood, white surfaces, functional simplicity, hygge warmth",
  },
  {
    id: "luxury",
    name: "Luxury",
    description: "High-end finishes, marble, gold accents",
    icon: "diamond-outline",
    promptModifier:
      "luxury high-end style with marble countertops, gold hardware, crystal lighting, premium appliances",
  },
  {
    id: "transitional",
    name: "Transitional",
    description: "Best of traditional and contemporary",
    icon: "git-compare-outline",
    promptModifier:
      "transitional style blending traditional warmth with contemporary clean lines, neutral palette",
  },
];

// ─── Budget options ────────────────────────────────────────

export const BUDGET_RANGES = [
  "Under $5,000",
  "$5,000 – $10,000",
  "$10,000 – $25,000",
  "$25,000 – $50,000",
  "$50,000 – $100,000",
  "$100,000+",
];
