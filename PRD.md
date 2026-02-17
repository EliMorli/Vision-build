# VisionBuild — Product Requirements Document

**Version:** 1.0
**Last updated:** 2026-02-17
**Status:** In development — UI complete, backend needs deployment

---

## 1. Product Overview

### 1.1 What is VisionBuild?
VisionBuild is a mobile app that lets homeowners photograph a room, pick a design
style, receive 4 AI-generated photorealistic redesigns, and then get connected to
local contractors with a professional project brief — all in under 5 minutes.

### 1.2 One-line pitch
"Snap a room, see it redesigned, get real estimates."

### 1.3 Core user flow (5 steps)
```
Sign In → Upload Photo → Pick Style → Browse Designs → Get Estimates
```

### 1.4 Target user
Homeowners considering a renovation who want to visualize the result before
committing to a contractor.

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Expo (React Native) + TypeScript | Cross-platform mobile app (iOS, Android, Web) |
| Routing | Expo Router v4 (file-based) | Navigation between screens |
| State | Zustand v5 | 3 global stores (auth, project, lead) |
| Auth | Supabase Auth | Google OAuth, Apple OAuth |
| Database | Supabase (PostgreSQL) | Profiles, projects, contractors, leads |
| Storage | Supabase Storage | Room photos + generated images |
| Edge Functions | Supabase Edge Functions (Deno) | Server-side AI calls |
| Room Analysis | OpenAI GPT-4o (vision) | Multimodal room analysis |
| Image Generation | Replicate SDXL (img2img) | Photorealistic redesign rendering |
| Email | Resend | Contractor lead emails |
| Icons | @expo/vector-icons (Ionicons) | All icons throughout the app |

---

## 3. External APIs Required

### 3.1 Supabase (required — app foundation)
- **What:** Database, auth, storage, edge function hosting
- **Keys needed:**
  - `EXPO_PUBLIC_SUPABASE_URL` — project URL (client-side, in `.env`)
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anonymous key (client-side, in `.env`)
  - `SUPABASE_SERVICE_ROLE_KEY` — auto-injected into Edge Functions
- **Setup:** Create project at supabase.com, run migrations, deploy functions
- **Free tier:** Yes — 500 MB database, 1 GB storage, 500K Edge Function invocations/month

### 3.2 OpenAI (required — room analysis + lead email)
- **What:** GPT-4o multimodal model
- **Key:** `OPENAI_API_KEY` (sk-...)
- **Set via:** `supabase secrets set OPENAI_API_KEY=sk-...`
- **Used by:** `analyze-room` function, `dispatch-lead` function
- **Cost:** ~$0.01-0.03 per room analysis, ~$0.02-0.05 per lead email

### 3.3 Replicate (required — image generation)
- **What:** SDXL img2img model for room redesigns
- **Key:** `REPLICATE_API_TOKEN` (r8_...)
- **Set via:** `supabase secrets set REPLICATE_API_TOKEN=r8_...`
- **Used by:** `generate-design` function
- **Model version:** `39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b`
- **Cost:** ~$0.02-0.05 per image ($0.08-0.20 per project for 4 images)

### 3.4 Resend (optional — contractor emails)
- **What:** Transactional email service
- **Key:** `RESEND_API_KEY` (re_...)
- **Set via:** `supabase secrets set RESEND_API_KEY=re_...`
- **Used by:** `dispatch-lead` function
- **Requires:** Verified sending domain (or use Resend test domain)
- **From address:** `VisionBuild <leads@visionbuild.app>`
- **Free tier:** Yes — 100 emails/day

### 3.5 Google Cloud Console (required for Google OAuth)
- **What:** OAuth 2.0 client credentials
- **Setup:** Create OAuth client in Google Cloud Console, paste Client ID + Secret into Supabase Dashboard → Auth → Providers → Google
- **Redirect URI:** Configure in Supabase, app uses `visionbuild://auth/callback`

### 3.6 Apple Developer (optional — for Apple Sign-In)
- **What:** Service ID for Sign in with Apple
- **Setup:** Configure in Apple Developer portal, add to Supabase Auth providers

---

## 4. File Structure (35 files)

```
Vision-build/
├── .env.example                          # Environment variable template
├── .gitignore                            # Git ignore rules
├── app.json                              # Expo config (scheme, plugins)
├── babel.config.js                       # Babel preset + reanimated plugin
├── package.json                          # Dependencies (22 deps, 3 devDeps)
├── tsconfig.json                         # TypeScript config (@ path alias)
│
├── app/                                  # ── SCREENS (Expo Router) ──
│   ├── _layout.tsx                       # Root Stack navigator + auth hydration
│   ├── index.tsx                         # Entry redirect (session → tabs, else → sign-in)
│   ├── (auth)/                           # Auth group (no header)
│   │   ├── _layout.tsx                   #   Stack with headerShown: false
│   │   ├── sign-in.tsx                   #   Onboarding carousel + OAuth buttons
│   │   └── callback.tsx                  #   OAuth deep link handler
│   ├── (tabs)/                           # Tab group (Projects + Capture)
│   │   ├── _layout.tsx                   #   Tab navigator config
│   │   ├── index.tsx                     #   Dashboard — project cards list
│   │   └── camera.tsx                    #   Photo capture / gallery picker
│   ├── editor/
│   │   └── [id].tsx                      #   Style selection (8 presets)
│   ├── result/
│   │   └── [id].tsx                      #   Design carousel (4 images)
│   └── handoff/
│       └── [id].tsx                      #   Lead handoff (3-step flow)
│
├── components/                           # ── SHARED UI COMPONENTS ──
│   ├── index.ts                          #   Barrel export
│   ├── Button.tsx                        #   4-variant button
│   ├── ProgressBar.tsx                   #   Animated progress track
│   ├── Banner.tsx                        #   Info banner with icon
│   └── EmptyState.tsx                    #   Empty state + FullScreenLoader
│
├── lib/                                  # ── APP LOGIC ──
│   ├── supabase.ts                       #   Supabase client + SecureStore adapter
│   ├── types.ts                          #   All TypeScript types + constants
│   ├── theme.ts                          #   Design tokens (colors, spacing, fonts)
│   └── store.ts                          #   3 Zustand stores (auth, project, lead)
│
├── assets/
│   └── images/                           #   (empty — needs app icon, splash)
│
└── supabase/                             # ── BACKEND ──
    ├── config.toml                       #   Supabase project config
    ├── migrations/
    │   ├── 00001_initial_schema.sql      #   Tables, RLS, triggers, indexes
    │   └── 00002_storage_buckets.sql     #   Storage bucket + policies
    └── functions/
        ├── _shared/cors.ts               #   CORS headers (shared)
        ├── analyze-room/index.ts         #   GPT-4o room analysis
        ├── generate-design/index.ts      #   Replicate SDXL image generation
        └── dispatch-lead/index.ts        #   GPT-4o email + Resend dispatch
```

---

## 5. Database Schema

### 5.1 Tables

#### `profiles` (auto-created on signup)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | References `auth.users.id`, cascading delete |
| `email` | text | From OAuth provider |
| `display_name` | text | From OAuth `full_name` metadata |
| `photo_url` | text? | Avatar URL from OAuth |
| `created_at` | timestamptz | Auto |
| `last_login_at` | timestamptz | Auto |

**RLS:** Users can SELECT and UPDATE their own row only.
**Trigger:** `on_auth_user_created` → auto-inserts a profile row on signup.

#### `projects`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `user_id` | uuid FK→profiles | Cascading delete |
| `title` | text | Auto-set to "{RoomType} Renovation" |
| `original_image_url` | text | Public URL in Supabase Storage |
| `room_analysis` | jsonb? | `{ roomType, currentStyle, estimatedSqFt, keyElements[], rawAnalysis }` |
| `selected_style` | text? | The style prompt modifier chosen |
| `generated_image_urls` | text[] | Array of 4 generated image URLs |
| `selected_generation_url` | text? | The single design the user picked |
| `status` | enum | `draft → analyzed → generated → connected → completed` |
| `lead_info` | jsonb? | `{ budgetRange, zipCode, projectBrief, matchedContractorIds[], submittedAt }` |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto via trigger |

**RLS:** Users can SELECT, INSERT, UPDATE, DELETE their own rows.
**Index:** `(user_id, updated_at DESC)` for dashboard query.
**Trigger:** `projects_updated_at` auto-sets `updated_at` on every UPDATE.

#### `contractors`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `business_name` | text | |
| `contact_name` | text | |
| `email` | text | Where lead emails are sent |
| `phone` | text | |
| `zip_code` | text | Used for geographic matching |
| `city` | text | |
| `state` | text | |
| `specialties` | text[] | e.g. `["kitchen", "bathroom", "flooring"]` |
| `rating` | numeric(2,1) | 0.0-5.0 |
| `completed_jobs` | int | |
| `is_active` | boolean | Only active contractors shown |
| `created_at` | timestamptz | Auto |

**RLS:** Authenticated users can SELECT where `is_active = true`.
**Index:** `(zip_code) WHERE is_active = true`.
**Note:** This table must be seeded manually — there is no contractor signup flow.

#### `leads`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | Auto-generated |
| `project_id` | uuid FK→projects | Cascading delete |
| `user_id` | uuid FK→profiles | Cascading delete |
| `contractor_id` | uuid FK→contractors | |
| `email_subject` | text | GPT-4o generated |
| `email_body` | text | GPT-4o generated |
| `original_image_url` | text | |
| `generated_image_url` | text | |
| `budget_range` | text | e.g. "$10,000 – $25,000" |
| `zip_code` | text | |
| `scope_of_work` | text[] | GPT-4o generated list of work items |
| `status` | enum | `pending → sent → viewed → accepted → declined → completed` |
| `created_at` | timestamptz | Auto |
| `responded_at` | timestamptz? | |

**RLS:** Users can SELECT their own leads.
**Index:** `(project_id, created_at DESC)`.

### 5.2 Enums
- `project_status`: `draft`, `analyzed`, `generated`, `connected`, `completed`
- `lead_status`: `pending`, `sent`, `viewed`, `accepted`, `declined`, `completed`

### 5.3 Storage
- **Bucket:** `room-photos` (public read)
- **Upload policy:** Authenticated users can upload to `{user_id}/` folder
- **Generated images:** Edge Function uploads to `{user_id}/generations/{project_id}/gen_0.png` through `gen_3.png` using service role (bypasses RLS)

---

## 6. Screens — Detailed Specification

### 6.1 Root Entry (`app/index.tsx`)
**Purpose:** Decides where to send the user on cold start.
**Logic:**
- If `loading` → full-screen `ActivityIndicator` (blue spinner)
- If `session` exists → `<Redirect href="/(tabs)" />`
- If no session → `<Redirect href="/(auth)/sign-in" />`

### 6.2 Root Layout (`app/_layout.tsx`)
**Purpose:** App shell — auth hydration + navigation stack.
**On mount:**
1. Calls `WebBrowser.maybeCompleteAuthSession()` (completes pending OAuth)
2. Calls `supabase.auth.getSession()` → hydrates auth store
3. Subscribes to `supabase.auth.onAuthStateChange()` for live session updates
**Navigation stack:**
- `(auth)` group — headerShown: false
- `(tabs)` group — headerShown: false
- `editor/[id]` — title: "Choose Style"
- `result/[id]` — title: "Your Designs"
- `handoff/[id]` — title: "Get Estimates"
**Header style:** White background, #202124 tint, 600 weight title, no shadow.

---

### 6.3 Sign-In Screen (`app/(auth)/sign-in.tsx`)

**Header:** Hidden (auth layout).

**Layout (top to bottom):**

1. **Logo row** (centered)
   - Ionicons `construct` icon (22px, blue)
   - "VisionBuild" text (20px, bold)

2. **Onboarding carousel** (horizontal FlatList, paging enabled)
   - **Page 1:** Camera icon → "Snap Your Space" → "Take a photo of any room in your home. Kitchen, bathroom, bedroom — we handle them all."
   - **Page 2:** Wand icon → "AI Redesigns It" → "Pick a style and our AI generates 4 photorealistic designs — keeping your walls, windows, and layout intact."
   - **Page 3:** People icon → "Get Real Estimates" → "We create a professional project brief and connect you with vetted local contractors in 24 hours."
   - Each page: 110px blue circle with 44px icon, heading text, body text

3. **Page indicator dots** (3 dots)
   - Active: 24px wide, blue
   - Inactive: 8px wide, blue at 30% opacity

4. **Auth buttons** (full width, stacked)
   - **"Continue with Google"** — primary variant (blue bg, white text), Google logo icon
   - **"Continue with Apple"** — outline variant (white bg, border), Apple logo icon
   - Both show loading spinner when tapped
   - Error text (red, 13px) shown below buttons on failure

**Behavior:**
- Tapping either button calls `signInWithOAuth("google"|"apple")`
- Opens system browser via `WebBrowser.openAuthSessionAsync()`
- On success, extracts `access_token` + `refresh_token` from URL fragment
- Calls `supabase.auth.setSession()` → store updates → redirects to `/(tabs)`

---

### 6.4 OAuth Callback (`app/(auth)/callback.tsx`)

**Not a user-visible screen** — just a spinner.

**Purpose:** Handles the `visionbuild://auth/callback#access_token=...` deep link.

**Logic:**
1. On mount: checks `Linking.getInitialURL()` (cold start)
2. Also listens to `Linking.addEventListener("url")` (warm start)
3. Extracts `access_token` and `refresh_token` from URL fragment
4. Calls `supabase.auth.setSession({ access_token, refresh_token })`
5. On success → `router.replace("/(tabs)")`

---

### 6.5 Dashboard (`app/(tabs)/index.tsx`)

**Tab:** "Projects" with home-outline icon.
**Header:** "VisionBuild" (set by tab config).

#### Empty state (0 projects):
- **Header row:** "Projects" (heading) + log-out icon (right-aligned)
- **Center content:** `EmptyState` component
  - 100px blue circle with home-outline icon (48px)
  - "No projects yet" (heading)
  - "Take a photo of any room to start visualizing your renovation." (body)
  - **Button:** "Start Your First Project" (primary, add-circle icon) → navigates to camera tab

#### Project list (1+ projects):
- **Header row:**
  - Left: "Projects" (heading) + "Welcome back, {firstName}" (subtitle)
  - Right: log-out icon button
- **FlatList** with pull-to-refresh (RefreshControl, blue tint)
- **Each project card:**
  - **Image:** 170px tall, shows `selected_generation_url` or falls back to `original_image_url`
  - **Status chip** (top-right, pill-shaped, colored background):
    - Draft → gray, document-outline icon
    - Analyzed → yellow, search-outline icon
    - Designs Ready → blue, color-palette-outline icon
    - Contractors Matched → green, people-outline icon
    - Completed → green, checkmark-circle-outline icon
  - **Card body:** title (17px, bold, 1 line) + rawAnalysis (14px, gray, 2 lines)
  - **Shadow:** elevation 2, black shadow at 8% opacity

**Tap behavior:**
- `analyzed` → navigates to `/editor/{id}`
- `generated` or `connected` → navigates to `/result/{id}`
- `draft` → no navigation (dead end — should not happen in normal flow)

**Sign out:** Tapping log-out icon calls `signOut()` → clears session → redirects to sign-in.

---

### 6.6 Camera Screen (`app/(tabs)/camera.tsx`)

**Tab:** "Capture" with camera-outline icon.
**Header:** "New Project" (set by tab config).

#### State: No photo selected
- **Hint text:** "Take a photo or pick one from your gallery to get started." (centered, gray)
- **Placeholder area** (flex: 1):
  - Dashed blue border (2px, 30% opacity)
  - Light gray background (#F8F9FA)
  - Center: 88px circle with image-outline icon (48px)
  - "Add a Room Photo" (18px, bold)
  - "Take a photo or choose from your gallery" (14px, gray)
  - Tapping anywhere opens the gallery picker
- **Bottom buttons** (row, equal width):
  - **"Camera"** — primary variant, camera icon → opens device camera
  - **"Gallery"** — outline variant, images icon → opens photo library

**Image picker options:**
- `mediaTypes: ["images"]`
- `quality: 0.9`
- `allowsEditing: true`
- `aspect: [4, 3]`

#### State: Photo selected, not uploading
- **Image preview** fills the flex area (rounded corners)
- **Overlay pill** (bottom center): refresh icon + "Tap to change" (dark semi-transparent bg)
- Tapping the image opens the gallery picker again
- **Bottom button:** "Analyze Room" (primary, sparkles icon, full width)

#### State: Uploading + analyzing
- Image preview stays visible
- **ProgressBar** appears below image (blue track, % fill, message text):
  - 0% → 15%: "Uploading photo..."
  - 15% → 50%: "Analyzing your room..."
  - 50% → 80%: "Creating project..."
  - 80% → 100%: "Done!"
- Buttons hidden during loading
- Tapping image is disabled

#### State: Error
- Red error text (13px, centered) shown above buttons

**On analyze success:**
- Creates project row in DB (status: `analyzed`)
- Sets `currentProject` in store
- Navigates to `/editor/{project.id}`

---

### 6.7 Style Editor (`app/editor/[id].tsx`)

**Header:** "Choose Style" (from root layout).

**Layout (top to bottom):**

1. **Room analysis banner** (`Banner` component, only if `room_analysis` exists):
   - Green checkmark icon + "Room Analyzed" title (green)
   - Subtitle: "{RoomType}, approx {sqFt} sq ft, {currentStyle}"
   - Key element chips (blue pills): e.g. "oak cabinets", "tile flooring"

2. **Section title:** "Select a Design Style" (18px, bold)

3. **Style grid** (FlatList, 2 columns, scrollable):
   8 style cards, each containing:

   | Style | Icon | Description |
   |-------|------|-------------|
   | Modern | cube-outline | Clean lines, neutral tones, minimalist |
   | Industrial | construct-outline | Exposed brick, metal accents, raw materials |
   | Farmhouse | home-outline | Warm wood, shiplap, rustic charm |
   | Coastal | water-outline | Light blues, whites, natural textures |
   | Mid-Century | ellipse-outline | Retro meets contemporary, organic curves |
   | Scandinavian | snow-outline | Light, airy, functional simplicity |
   | Luxury | diamond-outline | High-end finishes, marble, gold accents |
   | Transitional | git-compare-outline | Best of traditional and contemporary |

   **Unselected card:** Gray border (1.5px), white bg, gray icon (30px), black name (14px bold), gray description (12px)
   **Selected card:** Blue border (2px), light blue bg (4% opacity), blue icon, blue name, blue checkmark badge (22px circle, top-right)

4. **Footer:**
   - **When not loading:** "Generate 4 Designs" button (primary, sparkles icon, full width). Disabled (40% opacity) if no style selected.
   - **When loading:** `ProgressBar` component with message:
     - 0% → 30%: "Generating designs..."
     - 30% → 80%: "Saving designs..."

**On generate success:**
- Updates project in DB (status: `generated`, adds 4 image URLs)
- Navigates to `/result/{id}`

---

### 6.8 Result Screen (`app/result/[id].tsx`)

**Header:** "Your Designs" (from root layout).

**Layout (top to bottom):**

1. **Subtitle:** "Swipe to browse. Tap to select your favorite." (centered, gray)

2. **Hint pill** (self-centered, rounded):
   - Yellow background (10% opacity)
   - swap-horizontal icon + "Long-press any image to compare with original"

3. **Carousel** (horizontal FlatList):
   - Card width: 82% of screen width
   - Snaps to each card
   - **Each card:**
     - Rounded corners (20px), shadow (elevation 4)
     - Full-bleed image
     - **Option label** (bottom-left): "Option 1" through "Option 4" (dark pill)
     - **When selected:** 3px blue border + 32px blue checkmark circle (top-right)
   - **Tap:** Selects that image
   - **Long press:** Opens before/after comparison modal

4. **Page dots** (4 dots):
   - Active: 24px wide, blue
   - Inactive: 8px wide, blue at 20% opacity

5. **CTA button:** "Get Estimates" (secondary/green variant, briefcase icon, full width)
   - Disabled (40% opacity) until a design is selected

**Before/After Modal** (full-screen overlay):
- Dark backdrop (60% opacity)
- White card (92% screen width, rounded)
- **Title:** "Before & After"
- **Side-by-side layout:**
  - Left: original image + "Original" label
  - Right: selected redesign + "Redesign" label
  - Both images: 180px tall, rounded
- **Footer:** "Tap anywhere to close"
- Tapping backdrop closes modal

**On continue:**
- Calls `selectDesign(id, selectedUrl)` — updates `selected_generation_url` in DB
- Navigates to `/handoff/{id}`

---

### 6.9 Handoff Screen (`app/handoff/[id].tsx`)

**Header:** "Get Estimates" (from root layout).
**3-step flow:** Input → Preview → Success

#### Step 0: Budget & Zip Input

**Layout (ScrollView):**

1. **Heading:** "Almost there!" (24px, bold)
2. **Subtext:** "We need a couple of details to match you with the best local contractors." (gray)

3. **Budget Range section:**
   - Label: "Budget Range" (16px, bold)
   - 6 selectable chips (pill-shaped, wrap):
     - "Under $5,000"
     - "$5,000 – $10,000"
     - "$10,000 – $25,000"
     - "$25,000 – $50,000"
     - "$50,000 – $100,000"
     - "$100,000+"
   - **Unselected:** Gray border (1.5px), black text
   - **Selected:** Blue border, blue bg (10% opacity), blue bold text

4. **Zip Code section:**
   - Label: "Zip Code" (16px, bold)
   - TextInput: number-pad keyboard, max 5 chars, gray placeholder, 1.5px border

5. **CTA button:** "Generate Project Brief" (primary, document-text icon)
   - Disabled until budget is selected AND zip is exactly 5 digits

#### Step 1: Brief Preview

**Loading state:** `FullScreenLoader` with message ("Generating project brief...")

**Preview state (ScrollView):**

1. **Success banner** (`Banner` component): Green checkmark + "Project Brief Generated"

2. **Email preview card** (gray bg, rounded):
   - "Subject: {subject}" (15px, bold)
   - Divider line
   - "Scope of Work" heading
   - Bullet list of work items (e.g. "Flooring: Replace tile with hardwood/LVP")
   - Full email body text

3. **Matched contractors section** (if any found):
   - "Matched {N} Contractors" heading
   - **Each contractor row:**
     - 40px blue circle with business-outline icon
     - Business name (bold) + city + specialties (comma-separated)
     - Star rating badge (yellow bg pill): star icon + rating number
     - Bottom border separator

4. **CTA button:** "Connect with Contractors" (secondary/green, send icon)

5. **Error text** (red, centered) if dispatch fails

#### Step 2: Success

- `EmptyState` component:
  - checkmark-circle icon (in 100px circle)
  - "Leads Sent!" (heading)
  - "Your project brief has been sent to matched contractors. You'll receive responses within 24-48 hours."
- **Button:** "Back to Dashboard" (primary) → clears lead store, navigates to `/(tabs)`

---

## 7. Shared UI Components

### 7.1 `Button`
**File:** `components/Button.tsx`
**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | required | Button text |
| `onPress` | () => void | required | Tap handler |
| `variant` | "primary" \| "secondary" \| "outline" \| "ghost" | "primary" | Visual style |
| `icon` | Ionicons glyph name | undefined | Left icon |
| `loading` | boolean | false | Shows spinner, disables tap |
| `disabled` | boolean | false | Grays out (40% opacity) |
| `fullWidth` | boolean | true | Stretches to container |
| `style` | ViewStyle | undefined | Extra styles |

**Variant details:**
| Variant | Background | Text/Icon Color | Border |
|---------|-----------|----------------|--------|
| primary | #1A73E8 (blue) | white | none |
| secondary | #34A853 (green) | white | none |
| outline | transparent | #202124 | 1.5px #DADCE0 |
| ghost | transparent | #1A73E8 | none |

**Interaction:** Press reduces opacity to 85% + scales to 0.985x. Min height: 52px.

### 7.2 `ProgressBar`
**File:** `components/ProgressBar.tsx`
**Props:** `progress` (0-1), `message` (optional string)
**Visual:** 6px tall rounded track (blue at 10% opacity), blue fill. Message text below.

### 7.3 `Banner`
**File:** `components/Banner.tsx`
**Props:** `icon`, `iconColor`, `title`, `subtitle`, `children`, `style`
**Visual:** Light blue bg (3% opacity), 1px blue border (12% opacity), rounded. Icon + title row, subtitle below, children slot.

### 7.4 `EmptyState`
**File:** `components/EmptyState.tsx`
**Props:** `icon`, `title`, `subtitle`, `children` (action button slot)
**Visual:** Vertically centered. 100px circle (blue 7% opacity) with 48px icon. Heading, body text. Button area below.

### 7.5 `FullScreenLoader`
**File:** `components/EmptyState.tsx` (co-located export)
**Props:** `message` (optional string)
**Visual:** Vertically centered blue ActivityIndicator + message text.

---

## 8. Design Tokens

### 8.1 Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #1A73E8 | Buttons, links, active states, progress bars |
| `secondary` | #34A853 | Success states, green CTAs, contractor match |
| `accent` | #FBBC04 | Warnings, star ratings, hint pills |
| `error` | #EA4335 | Error messages, validation |
| `surface` | #F8F9FA | Card backgrounds, input fills |
| `background` | #FFFFFF | Screen backgrounds |
| `textPrimary` | #202124 | Headings, body text |
| `textSecondary` | #5F6368 | Subtitles, hints, timestamps |
| `border` | #DADCE0 | Card borders, dividers, input borders |

### 8.2 Spacing
| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps |
| `sm` | 8px | Element gaps, chip padding |
| `md` | 16px | Section padding, card padding |
| `lg` | 24px | Screen padding, large gaps |
| `xl` | 32px | Section spacing |
| `xxl` | 48px | Hero spacing |

### 8.3 Border Radius
| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 8px | Chips, small elements |
| `md` | 12px | Buttons, inputs, cards |
| `lg` | 16px | Large cards, image containers |
| `xl` | 20px | Carousel cards |
| `full` | 9999px | Pills, dots, avatars |

### 8.4 Typography
| Token | Size | Weight | Color | Usage |
|-------|------|--------|-------|-------|
| `regular` | 14px | normal | textSecondary | Captions, hints |
| `body` | 16px | normal | textPrimary | Body text, descriptions |
| `title` | 20px | 600 | textPrimary | Card titles, section headers |
| `heading` | 24px | 600 | textPrimary | Screen headings |
| `hero` | 32px | 700 | textPrimary | (defined but unused currently) |

---

## 9. State Management (Zustand)

### 9.1 `useAuthStore`
**File:** `lib/store.ts`

| Field | Type | Description |
|-------|------|-------------|
| `session` | Session \| null | Supabase auth session |
| `profile` | Profile \| null | User's profile row |
| `loading` | boolean | True during hydration or OAuth flow |
| `error` | string \| null | Auth error message |

| Method | Description |
|--------|-------------|
| `setSession(session)` | Saves session, stops loading, fetches profile |
| `fetchProfile()` | Queries `profiles` table for current user |
| `signInWithOAuth(provider)` | Full OAuth flow: get URL → open browser → extract tokens → set session |
| `signOut()` | Calls `supabase.auth.signOut()`, clears session + profile |

### 9.2 `useProjectStore`
**File:** `lib/store.ts`

| Field | Type | Description |
|-------|------|-------------|
| `projects` | Project[] | All user's projects (sorted by updated_at DESC) |
| `currentProject` | Project \| null | The project being worked on |
| `loading` | boolean | True during upload/analyze/generate |
| `progress` | number | 0-1 progress value |
| `progressMessage` | string | Human-readable progress text |
| `error` | string \| null | Error message |

| Method | Calls | Description |
|--------|-------|-------------|
| `fetchProjects()` | Supabase query | Loads all projects for the current user |
| `setCurrentProject(project)` | — | Sets the working project |
| `uploadAndAnalyze(imageUri)` | Storage upload → `analyze-room` Edge Function → DB insert | Full photo upload + AI analysis pipeline |
| `generateDesigns(projectId, stylePrompt)` | `generate-design` Edge Function → DB refresh | Triggers 4 SDXL generations |
| `selectDesign(projectId, url)` | DB update | Saves `selected_generation_url` |

**`uploadAndAnalyze` pipeline detail:**
1. Read image file as ArrayBuffer (not Blob — React Native compat)
2. Upload to `room-photos/{userId}/{timestamp}.jpg`
3. Get public URL
4. Call `analyze-room` Edge Function with `{ imageUrl }`
5. Insert project row with analysis result, status: `analyzed`
6. Return project, navigate to editor

**`generateDesigns` pipeline detail:**
1. Call `generate-design` Edge Function with `{ projectId, stylePrompt, roomAnalysis }`
2. Edge Function creates 4 Replicate predictions sequentially
3. Each prediction polls every 2s until complete
4. Downloads generated images, re-uploads to Supabase Storage
5. Updates project row with `generated_image_urls`, status: `generated`
6. Client refreshes project from DB, navigates to result

### 9.3 `useLeadStore`
**File:** `lib/store.ts`

| Field | Type | Description |
|-------|------|-------------|
| `matchedContractors` | Contractor[] | Contractors found for the zip code |
| `emailPreview` | { subject, body, scopeOfWork[] } \| null | GPT-4o generated email |
| `loading` | boolean | True during brief generation or dispatch |
| `progressMessage` | string | Status text |
| `error` | string \| null | Error message |

| Method | Calls | Description |
|--------|-------|-------------|
| `generateBriefAndMatch(params)` | `dispatch-lead` Edge Function (preview: true) | Generates email + finds contractors, no send |
| `dispatchLeads(params)` | `dispatch-lead` Edge Function (preview: false) | Actually sends emails + creates lead rows |
| `clear()` | — | Resets store to initial state |

---

## 10. Edge Functions (Backend)

### 10.1 `analyze-room`
**Runtime:** Deno (Supabase Edge Function)
**Trigger:** Called from client via `supabase.functions.invoke("analyze-room")`

**Input:**
```json
{ "imageUrl": "https://...supabase.co/storage/v1/object/public/room-photos/..." }
```

**Process:**
1. Sends image URL to OpenAI GPT-4o with vision prompt
2. Prompt instructs: analyze room, return structured JSON
3. Parses response (strips markdown fences if present)
4. Falls back to raw text if JSON parsing fails

**Output:**
```json
{
  "success": true,
  "analysis": {
    "roomType": "kitchen",
    "currentStyle": "dated oak traditional",
    "estimatedSqFt": 150,
    "keyElements": ["oak cabinets", "tile flooring", "fluorescent lighting"],
    "rawAnalysis": "This is a mid-size kitchen with oak cabinetry..."
  }
}
```

**OpenAI config:** `model: "gpt-4o"`, `max_tokens: 800`

### 10.2 `generate-design`
**Runtime:** Deno (Supabase Edge Function)
**Trigger:** Called from client via `supabase.functions.invoke("generate-design")`

**Input:**
```json
{
  "projectId": "uuid",
  "stylePrompt": "modern minimalist style with clean lines...",
  "roomAnalysis": "A mid-size kitchen with oak cabinetry..."
}
```

**Process:**
1. Fetches project from DB to get `original_image_url` and `user_id`
2. Constructs prompt: "Redesign this room with {style}. PRESERVE the exact room layout..."
3. Loops 4 times:
   a. Creates Replicate prediction (SDXL img2img)
   b. Polls every 2 seconds until succeeded/failed
   c. Downloads output image
   d. Re-uploads to Supabase Storage at `{userId}/generations/{projectId}/gen_{i}.png`
4. Updates project row: `generated_image_urls`, `selected_style`, `status: "generated"`

**Replicate config:**
- Model: SDXL (`39ed52f2...`)
- `guidance_scale: 7.5`
- `prompt_strength: 0.65` (preserves ~35% of original structure)
- `num_inference_steps: 40`
- `width: 1024`, `height: 1024`
- `num_outputs: 1` (per call)

**Performance:** ~30-45 seconds per image, ~2-3 minutes total for 4 images.

### 10.3 `dispatch-lead`
**Runtime:** Deno (Supabase Edge Function)
**Trigger:** Called from client via `supabase.functions.invoke("dispatch-lead")`

**Input:**
```json
{
  "projectId": "uuid",
  "originalImageUrl": "https://...",
  "generatedImageUrl": "https://...",
  "zipCode": "90210",
  "budgetRange": "$10,000 – $25,000",
  "userName": "John Doe",
  "roomType": "kitchen",
  "preview": true
}
```

**Process (preview: true):**
1. Sends before/after images to GPT-4o with contractor email prompt
2. Parses response: `{ subject, scopeOfWork[], projectType, body }`
3. Queries contractors table: `zip_code = zipCode AND is_active = true LIMIT 5`
4. Returns email preview + matched contractors (no emails sent, no DB writes)

**Process (preview: false):**
1. Same GPT-4o call as preview mode
2. Same contractor query
3. For each contractor:
   a. Creates lead row in `leads` table (status: `sent`)
   b. Sends email via Resend API (HTML formatted)
   c. Replaces `[Contractor Name]` placeholder in email body
4. Updates project: `status: "connected"`, saves `lead_info` JSON

**GPT-4o prompt details:**
- Compares Image A (current) with Image B (goal)
- Identifies specific work items for the transformation
- Returns structured JSON: subject line, scope of work list, email body
- Includes client name, zip, budget, room type, "Timeline: Flexible"

**Resend email config:**
- From: `VisionBuild <leads@visionbuild.app>`
- To: contractor's email
- Subject: GPT-4o generated
- Body: GPT-4o generated (newlines → `<br>` tags)

---

## 11. Navigation Map

```
app/index.tsx (redirect)
│
├─ No session ──→ (auth)/sign-in.tsx
│                     │
│                     ├── Google OAuth ──→ (auth)/callback.tsx ──→ (tabs)/
│                     └── Apple OAuth  ──→ (auth)/callback.tsx ──→ (tabs)/
│
└─ Has session ──→ (tabs)/
                     │
                     ├── Tab: Projects ──→ (tabs)/index.tsx (dashboard)
                     │                       │
                     │                       ├── Tap analyzed project ──→ editor/[id].tsx
                     │                       └── Tap generated project ──→ result/[id].tsx
                     │
                     └── Tab: Capture ──→ (tabs)/camera.tsx
                                            │
                                            └── Analyze success ──→ editor/[id].tsx
                                                                      │
                                                                      └── Generate success ──→ result/[id].tsx
                                                                                                │
                                                                                                └── Select + continue ──→ handoff/[id].tsx
                                                                                                                           │
                                                                                                                           └── Step 2 success ──→ (tabs)/ (dashboard)
```

---

## 12. Authentication Flow (Detailed)

```
┌──────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│  sign-in.tsx │     │  System Browser   │     │  Supabase Auth      │
│              │     │  (WebBrowser)     │     │                     │
│  Tap Google  ├────►│                   ├────►│  Google OAuth page  │
│              │     │                   │     │  User signs in      │
│              │     │                   │◄────┤  Redirect to:       │
│              │     │  visionbuild://   │     │  visionbuild://     │
│              │◄────┤  auth/callback    │     │  auth/callback      │
│              │     │  #access_token=.. │     │  #access_token=...  │
└──────┬───────┘     └───────────────────┘     └─────────────────────┘
       │
       │  Extract tokens from URL fragment
       │  supabase.auth.setSession({access_token, refresh_token})
       │
       ▼
┌──────────────┐     ┌───────────────────┐
│  Auth Store  │     │  profiles table   │
│              │     │                   │
│  session ✓   ├────►│  Auto-created via │
│  fetchProfile│     │  on_auth_user_    │
│              │◄────┤  created trigger  │
│  profile ✓   │     │                   │
└──────┬───────┘     └───────────────────┘
       │
       │  Redirect to /(tabs)
       ▼
   Dashboard
```

---

## 13. Full User Journey (End-to-End)

### Step 1: Sign In
1. User opens app → sees onboarding carousel (3 slides)
2. Taps "Continue with Google"
3. Browser opens → Google sign-in → redirect back to app
4. Profile auto-created → lands on empty dashboard

### Step 2: Capture Room
1. Taps "Start Your First Project" button (or Capture tab)
2. Sees placeholder with "Add a Room Photo"
3. Taps "Camera" button → device camera opens → takes photo
4. Photo appears in preview area
5. Taps "Analyze Room" → progress bar shows upload + analysis
6. ~5-10 seconds → auto-navigates to editor

### Step 3: Choose Style
1. Sees green "Room Analyzed" banner with details (room type, sq ft, elements)
2. Scrolls through 8 style cards in 2-column grid
3. Taps "Modern" → card gets blue border + checkmark badge
4. Taps "Generate 4 Designs" → progress bar shows generation
5. ~2-3 minutes → auto-navigates to result

### Step 4: Browse Designs
1. Sees 4 generated designs in swipeable carousel
2. Swipes through options 1-4
3. Long-presses option 2 → before/after modal shows side-by-side comparison
4. Taps option 2 to select it (checkmark appears)
5. Taps "Get Estimates" button

### Step 5: Get Estimates
1. Sees budget selection chips → taps "$10,000 – $25,000"
2. Types zip code "90210"
3. Taps "Generate Project Brief" → loading spinner
4. Sees generated email preview with scope of work bullet points
5. Sees 3 matched contractors with names, locations, specialties, ratings
6. Taps "Connect with Contractors" → emails sent
7. Sees "Leads Sent!" success screen
8. Taps "Back to Dashboard" → project card now shows "Contractors Matched" chip

---

## 14. Deployment Checklist

### 14.1 Supabase Setup
- [ ] Create Supabase project at supabase.com
- [ ] Run migration: `supabase db push` (creates tables, RLS, triggers, storage)
- [ ] Enable Google OAuth provider (needs Google Cloud OAuth client)
- [ ] Enable Apple OAuth provider (optional, needs Apple Developer)
- [ ] Set redirect URL: `visionbuild://auth/callback`
- [ ] Deploy Edge Functions: `supabase functions deploy`
- [ ] Set secrets:
  ```bash
  supabase secrets set OPENAI_API_KEY=sk-...
  supabase secrets set REPLICATE_API_TOKEN=r8_...
  supabase secrets set RESEND_API_KEY=re_...
  ```
- [ ] Seed contractor data (manual insert into contractors table)

### 14.2 App Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Run `npm install`
- [ ] Run `npx expo start`

### 14.3 Resend Setup (for real email delivery)
- [ ] Create Resend account
- [ ] Verify sending domain (or use test domain for dev)
- [ ] Update `from` address in `dispatch-lead` if using different domain

### 14.4 Test the Full Flow
- [ ] Sign in with Google OAuth
- [ ] Upload a room photo
- [ ] Verify room analysis returns valid JSON
- [ ] Select a style and generate designs
- [ ] Verify 4 images appear in carousel
- [ ] Select a design, enter budget + zip
- [ ] Verify contractor email preview looks good
- [ ] Send leads and verify emails arrive

---

## 15. Known Limitations & Future Work

### Current Limitations
1. **No contractor signup** — contractors must be manually seeded in DB
2. **Sequential image generation** — 4 SDXL calls happen one at a time (~2-3 min)
3. **No push notifications** — user won't know when contractor responds
4. **No in-app messaging** — contractor communication happens via email only
5. **No payment** — no monetization or payment processing
6. **Zip-code-only matching** — doesn't handle radius-based search
7. **No image editing** — user can't mask/annotate areas of the room
8. **No offline support** — requires internet for all operations
9. **Replicate model version hardcoded** — may need updating if deprecated
10. **No splash screen or app icon** — assets/images/ directory is empty

### Future Improvements
- Parallelize Replicate calls (4 concurrent instead of sequential)
- Add stripe/payment for premium features
- Contractor portal (web dashboard for contractors to manage leads)
- Push notifications when contractor responds
- In-app chat between homeowner and contractor
- Radius-based contractor matching (PostGIS)
- Before/after slider component (drag to reveal)
- Share generated designs to social media
- Multiple rooms per project
- Project timeline / progress tracking
