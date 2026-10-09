# VisionBuild

Home renovation visualization tool — from imagination to contractor execution.

## Stack

- **Frontend**: React Native + Expo Router + TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenRouter (enforced in production for zero data retention)
- **Image Generation**: OpenRouter by default (same `AI_API_KEY`), or Mock locally. No Replicate token needed.
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

Handles image generation. In production the `generate-design` edge function renders via OpenRouter (the default and only allowed provider); `MockRenderProvider` is used in mock mode.

```typescript
interface RenderProvider {
  generate(imageUrl: string, stylePrompt: string, count?: number): Promise<string>; // jobId
  getProgress(jobId: string): Promise<RenderProgress>;
  cancel(jobId: string): Promise<void>;
}
```

### AssistantProvider

Handles AI chat. In production the `assistant-chat` edge function calls OpenRouter with `AI_API_KEY`; `MockAssistantProvider` is used in mock mode.

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

### Client-Side
- ✅ 13+ age gate with confirmation
- ✅ Terms of Service and Privacy Policy links on sign-in
- ✅ Permission primers before system prompts
- ✅ AI consent disclosing Google and Anthropic models via OpenRouter (versioned)
- ✅ "AI visualization, not a plan or quote" disclaimer
- ✅ Granular privacy toggles for contractor data sharing
- ✅ Report/Block on all user-generated content
- ✅ Public/Private project controls
- ✅ Settings: notifications, marketing, reduce motion, Your Privacy Choices, delete account
- ✅ EXIF/GPS stripping on client before upload (ImageManipulator re-encoding)

### Server-Side
- ✅ Private storage with RLS (users can only access their own files)
- ✅ Signed URLs (1 year validity) instead of public URLs
- ✅ JWT verification on all edge functions
- ✅ Per-user rate limiting (10 analyze, 5 generate, 3 dispatch per day)
- ✅ Project ownership verification before processing
- ✅ CAN-SPAM compliance: business address + unsubscribe link in emails
- ✅ Contractor opt-out table and filtering
- ✅ Outreach audit log (fields shared, timestamps, message IDs)
- ✅ Account deletion: storage cleanup + database cascade + auth user deletion
- ✅ Apple Sign-In token revocation (when credentials configured)
- ⚠️ **Note:** Server should also strip EXIF from uploaded images (future enhancement)

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
npm run lint       # Run ESLint
npm run check:models  # Validate AI models are on OpenRouter's ZDR list
```

**Important:** Before changing any `AI_MODEL_*` environment variables, run `npm run check:models` to verify all configured models support Zero Data Retention. Using non-ZDR models in production would violate our privacy commitments.

## Supabase Setup

### Database Migrations

Run migrations to set up tables and RLS:

```bash
npx supabase db push
```

Migrations include:
- `00001_initial_schema.sql` - Core tables (profiles, projects, contractors, leads)
- `00002_storage_buckets.sql` - Original storage setup
- `00003_compliance_tables.sql` - Reports, consents, usage_events, outreach_log, contractor_optouts
- `00004_storage_privacy.sql` - Private buckets + RLS

### Edge Function Secrets

Required secrets:

```bash
# AI: ONE OpenRouter key (also used for image generation; render provider defaults to OpenRouter).
# Turn on zero data retention in your OpenRouter settings.
# No Replicate token and no direct OpenAI key are needed (production refuses both).
npx supabase secrets set AI_API_KEY=sk-or-...

# Email (Resend)
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set BUSINESS_MAILING_ADDRESS="YourCompany Inc., 123 Main St, City, ST 12345"
npx supabase secrets set UNSUBSCRIBE_SECRET="$(openssl rand -base64 32)"
```

Optional secrets:

```bash
# AI model overrides (OpenRouter model IDs - run npm run check:models first!)
npx supabase secrets set AI_MODEL_VISION=google/gemini-2.5-pro
npx supabase secrets set AI_MODEL_TEXT=anthropic/claude-sonnet-5.5
npx supabase secrets set AI_MODEL_CHAT=anthropic/claude-sonnet-5.5
npx supabase secrets set AI_MODEL_RENDER_PREVIEW=google/gemini-3.1-flash-image
npx supabase secrets set AI_MODEL_RENDER_FINAL=google/gemini-3.1-flash-image

# Rate limits (defaults: 10, 5, 3)
npx supabase secrets set RATE_LIMIT_ANALYZE_ROOM=10
npx supabase secrets set RATE_LIMIT_GENERATE_DESIGN=5
npx supabase secrets set RATE_LIMIT_DISPATCH_LEAD=3

# Apple Sign-In token revocation
npx supabase secrets set APPLE_TEAM_ID=YOUR_TEAM_ID
npx supabase secrets set APPLE_KEY_ID=YOUR_KEY_ID
npx supabase secrets set APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
npx supabase secrets set APPLE_CLIENT_ID=com.yourapp.service

# Environment (fail-closed security: missing/unknown → production)
# Only "development" or "staging" (case-insensitive) unlock non-prod features
# Production enforces OpenRouter-only and blocks Replicate/OpenAI-direct
npx supabase secrets set APP_ENV=production  # or omit (defaults to production)
```

### Generate Types

```bash
npm run supabase:types
```

## Environment Variables

### Client (.env)

```env
# Supabase connection
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Support email (optional, hides button if not set)
EXPO_PUBLIC_SUPPORT_EMAIL=support@yourdomain.com

# Mock mode (dev only, ignored in production builds)
EXPO_PUBLIC_DEV_MOCK_SESSION=true
```

### Server (Supabase Secrets)

See Edge Function Secrets section above. All server secrets are set via `supabase secrets set` and never exposed to the client.

## 🚀 Pre-Launch Plug-In Checklist

Before deploying to production, fill in all required configuration. Run `npm run doctor` to validate.

### 1. Business Configuration

Edit `lib/config/business.ts` and `supabase/functions/_shared/business.ts`:

- [ ] `LEGAL_NAME` - Your legal business name (e.g., "VisionBuild Inc.")
- [ ] `ENTITY_TYPE` - Entity type (e.g., "Delaware C Corporation")
- [ ] `MAILING_ADDRESS` - Complete mailing address (street, city, state, ZIP)
- [ ] `SUPPORT_EMAIL` - Support email address
- [ ] `WEBSITE_DOMAIN` - Your website domain (e.g., "visionbuild.com")
- [ ] `EMAIL_FROM_NAME` - Display name for outgoing emails
- [ ] `EMAIL_REPLY_TO` - Reply-to email address

### 2. Environment Variables (.env)

Required:

- [ ] `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `EXPO_PUBLIC_SUPPORT_EMAIL` - Support email (same as business config)
- [ ] `EXPO_PUBLIC_LEGAL_BASE_URL` - **Elimar fill-in.** URL where `web-legal/dist` is deployed (e.g. `https://visionbuild.app/legal`). The default is a placeholder and release CI fails until this is set. Also add it as a GitHub Actions repository variable.
- [ ] Deploy the legal website: `npm run legal:build -- --release`, then upload `web-legal/dist/` to your static host (see docs/HANDOFF.md → Legal pages). Not deployed by CI.
- [ ] Fill in the Privacy Policy v2 effective date in `web-legal/versions.json`

Optional:

- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `APPLE_CLIENT_ID` - Apple Sign-In client ID

### 3. Supabase Secrets

Required (set via `npx supabase secrets set KEY=value`):

- [ ] `AI_API_KEY` - your OpenRouter API key (the only AI key; covers analysis, chat and image generation)
- [ ] In OpenRouter settings, turn on zero data retention (ZDR)
- [ ] `RESEND_API_KEY` - Resend API key for emails
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (Supabase is the database)

Not needed: there is no Replicate token and no direct OpenAI key. Production only allows OpenRouter.

Optional:

- [ ] `ADMIN_EMAILS` - Comma-separated admin emails (for moderation access)

### 4. Storage Buckets

Ensure these buckets exist in Supabase Storage:

- [ ] `room-photos` (private) - User-uploaded room photos and generated designs
- [ ] `profile-photos` (private) - User profile avatars
- [ ] `public-designs` (public) - Public project designs for Explore feed

### 5. Database Migrations

Run all migrations:

```bash
npx supabase db push
```

Verify tables exist:
- profiles, projects, contractors, user_settings, pro_waitlist
- user_consents, reports, blocks, moderation_log
- xp_events, account_deletion_requests

### 6. Legal Pages

Update content in:

- [ ] `content/legal/terms-of-service.md` - Remove DRAFT marker, add your terms
- [ ] `content/legal/privacy-policy.md` - Update with your company details

### 7. App Store Submissions

Use `docs/STORE_PRIVACY.md` to fill out:

- [ ] Apple App Privacy questionnaire
- [ ] Google Play Data Safety form

### 8. Validate Configuration

Run the doctor script to check everything:

```bash
npm run doctor
```

It will:
- ✅ Check all required environment variables
- ✅ Check all business config fields
- ✅ Warn about missing optional config
- ❌ Exit with error in production mode if anything is missing

### 9. Testing

Run all test suites:

```bash
npm run lint          # ESLint checks
npx tsc --noEmit      # TypeScript checks
npm run check:models  # Zod model validation
npm run db:test       # SQL migration tests
npm run fn:test       # Edge function tests
npm run e2e:web       # End-to-end tests
```

### 10. Deploy

Once all checks pass:

1. Commit and push your changes
2. Deploy edge functions: `npx supabase functions deploy`
3. Build and submit your app to app stores
4. Monitor edge function logs: `npx supabase functions logs`

---

## 📝 Notes

- **Mock Mode**: Set `EXPO_PUBLIC_DEV_MOCK_SESSION=true` in .env for local development without backend
- **Contractor Waitlist**: "Find me a pro" currently shows a coming-soon screen and collects waitlist signups
- **Moderation**: Admin access is controlled by `ADMIN_EMAILS` environment variable
- **Privacy**: We don't use analytics, tracking, or advertising SDKs. See `docs/STORE_PRIVACY.md` for details.

