# VisionBuild

Home renovation visualization tool — from imagination to contractor execution.

## Stack

- **Frontend**: React Native + Expo Router + TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4o (analysis + chat), Replicate SDXL (image generation)
- **Email**: Resend
- **State**: Zustand

## Features

- 🎨 AI-powered room design generation
- 💬 Vi: conversational design assistant
- 📸 Photo upload and room analysis
- 🏗️ Contractor matching and handoff
- 🔒 COPPA compliance, permission primers, AI consent
- ♿ WCAG 2.1 accessibility (labels, 44pt targets, reduce motion, Dynamic Type)
- 🎮 Game-style UI with chunky buttons and playful animations

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

#### For Production:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### For Development with Mock Data:

To run the app locally without a backend, enable mock mode:

```env
EXPO_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=placeholder
EXPO_PUBLIC_DEV_MOCK_SESSION=true
```

**Important:** `EXPO_PUBLIC_DEV_MOCK_SESSION` only works in development builds (`__DEV__ === true`). It will not bypass auth or load mock data in production builds, even if set.

Mock mode provides:
- Fake authenticated session (skips sign-in)
- 3 sample projects with generated designs
- Canned AI chat responses
- Progressive design generation simulation

### 3. Run the App

```bash
npx expo start
```

Press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser

## Project Structure

```
app/
  (auth)/           # Sign-in screen
  (tabs)/           # Bottom tab navigation (Home, Explore, Create, Inbox, Profile)
  splash.tsx        # Gradient splash screen
  intro.tsx         # 3-slide onboarding with before/after slider
  create-choice.tsx # Choose: "Brainstorm with Vi" or "Snap a Photo"
  assistant-chat.tsx # AI chat interface
  permission-primer.tsx # Camera/photos/location primers
  ai-consent.tsx    # AI consent screen
  handoff-confirm.tsx # Privacy toggles for contractor sharing
  profile-settings.tsx # Settings & Privacy screen
  project/[id].tsx  # Project detail page
  editor/[id].tsx   # Style selection
  result/[id].tsx   # Generated designs carousel
  handoff/[id].tsx  # Contractor estimates

components/
  Button.tsx        # Chunky game-style button with solid bottom edge

lib/
  store.ts          # Zustand stores (auth, projects, leads)
  theme.ts          # Design tokens (colors, spacing, fonts)
  types.ts          # TypeScript types
  providers/        # Swappable AI & rendering providers
    RenderProvider.ts         # Image generation interface
    MockRenderProvider.ts     # Mock progressive generation
    AssistantProvider.ts      # Chat interface
    MockAssistantProvider.ts  # Canned responses

supabase/
  functions/        # Edge Functions (image-generation, dispatch-lead)
```

## Provider Architecture

VisionBuild uses swappable provider interfaces for easy backend integration:

### RenderProvider

Handles image generation. Swap `MockRenderProvider` with `ReplicateRenderProvider` for real generation.

```typescript
interface RenderProvider {
  generate(imageUrl: string, stylePrompt: string, count?: number): Promise<string>; // jobId
  getProgress(jobId: string): Promise<RenderProgress>;
  cancel(jobId: string): Promise<void>;
}
```

### AssistantProvider

Handles AI chat. Swap `MockAssistantProvider` with OpenAI integration.

```typescript
interface AssistantProvider {
  chat(messages: AssistantMessage[], userMessage: string, images?: string[]): Promise<AssistantMessage>;
  generateDesign(messages: AssistantMessage[], prompt: string): Promise<AssistantMessage>;
}
```

## User Flow

1. **Splash & Intro** → Shown once on first launch
2. **Sign-in** → Google/Apple OAuth (or mock session in dev)
3. **Permission Primers** → Camera, photos, location (shown before system prompts)
4. **AI Consent** → Shown once before first AI use
5. **Create Flow:**
   - **Path A:** Snap a Photo → Space Type → Style → Designs
   - **Path B:** Brainstorm with Vi → Chat → Inline Designs
6. **Handoff Confirmation** → Privacy toggles before sharing with contractors
7. **Inbox** → Outreach tracker + contractor messages

## Compliance & Privacy

- ✅ 13+ age gate with confirmation
- ✅ Terms of Service and Privacy Policy links
- ✅ Permission primers before system prompts
- ✅ AI consent with OpenAI/Replicate disclosure
- ✅ "AI visualization, not a plan or quote" disclaimer
- ✅ Granular privacy toggles for contractor data sharing
- ✅ Report/Block on all user-generated content
- ✅ Public/Private project controls
- ✅ Settings: notifications, marketing, reduce motion, Your Privacy Choices, delete account

## Accessibility

- ✅ Accessibility labels on all interactive elements
- ✅ Button alternative for drag-based before/after slider
- ✅ Reduce motion toggle (honors system setting)
- ✅ Dynamic Type text scaling ready
- ✅ Minimum 44pt tap targets
- ✅ Proper `accessibilityRole` and `accessibilityState`

## Scripts

```bash
npm start          # Start Expo dev server
npm run android    # Run on Android
npm run ios        # Run on iOS
npm run web        # Run in browser
npm run lint       # Run ESLint (requires setup)
```

## Supabase Setup

Set Edge Function secrets:

```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set REPLICATE_API_TOKEN=r8_...
npx supabase secrets set RESEND_API_KEY=re_...
```

Generate types:

```bash
npm run supabase:types
```
