# VisionBuild MVP Readiness Audit

**Date:** October 8, 2026  
**Branch:** `cursor/visionbuild-client-flow-740f`  
**Audit Scope:** Full app readiness for MVP launch

---

## Executive Summary

**Overall Readiness: 45% complete for MVP**

- ✅ **Core UI**: 95% complete - All major screens designed and implemented
- ⚠️ **Button Functionality**: Only 17% of buttons fully working (7/42 tested)
- ⚠️ **Data Persistence**: Mock-only for most features; Supabase integration partial
- ❌ **End-to-End Flows**: 2/7 flows work in mock mode, 0/7 work against real backend
- ❌ **Backend Integration**: 4/7 Edge Functions called, migrations untested
- ⚠️ **Production Readiness**: Storage buckets undefined, no realtime, no push notifications

**Critical Blockers for MVP:**
1. Camera/photo capture flow not implemented (core feature)
2. No contractor matching or quote ingestion (core value prop)
3. Most backend integrations stubbed or mocked
4. No data persistence beyond session (everything lost on app restart)

---

## 1. Buttons and Interaction Audit

### Test Methodology
Playwright script tested 14 screens in mock mode (390x844 viewport), clicking every pressable element.

### Results Summary
| Metric | Count | % |
|--------|-------|---|
| Total Screens | 14 | 100% |
| Total Buttons Tested | 42 | 100% |
| **Working Buttons** | **7** | **17%** |
| **Dead/No-op Buttons** | **35** | **83%** |
| Console Errors | 3 | - |

### Working Buttons (7)
1. ✅ **intro** → "Get Started" → navigates to /sign-in
2. ✅ **home** → "Continue" button → navigates to home (consent flow)
3. ✅ **explore** → "Home" tab → navigates to /
4. ✅ **inbox** → "Home" tab → navigates to /
5. ✅ **profile** → "Home" tab → navigates to /
6. ✅ **assistant-chat** → "Find Me a Pro" → navigates to /handoff/placeholder
7. ✅ **result-error-rate-limit** → "Back to Home" → navigates to /

### Critical Dead Buttons

#### Sign-In Flow (4 dead)
- ❌ **"Continue with Google"** - disabled (no OAuth flow in mock mode)
- ❌ **"Continue with Apple"** - disabled (no OAuth flow in mock mode)
- ❌ **"Terms of Service"** - link opens blank (no external URL handler)
- ❌ **"Privacy Policy"** - link opens blank (no external URL handler)

#### Home Screen (6 dead)
- ❌ **"Start Your First Project"** - disabled (navigates to /(tabs)/camera which doesn't exist)
- ❌ **All 5 tab bar buttons** - disabled/hidden in empty state

#### Core Actions (4 dead)
- ❌ **editor-style** → "Generate 4 Designs" - disabled (no project selected)
- ❌ **result** → "Get Estimates" - disabled (no design selected)
- ❌ **handoff** → "Generate Project Brief" - disabled (no brief data)
- ❌ **profile** → "Sign Out" - no-op (calls signOut but doesn't clear session in mock mode)

#### Settings Toggles (5 dead - all state change but no persistence)
- ❌ **Push Notifications** - changes local state only, not persisted
- ❌ **Marketing Emails** - changes local state only, not persisted
- ❌ **Public Projects by Default** - changes local state only, not persisted
- ❌ **Opt out of AI processing** - calls Supabase update (fails in mock)
- ❌ **Reduce Motion** - stores to Zustand only, not persisted

#### Vi Chat (1 dead)
- ❌ **"Generate Design"** - no-op (no handler implemented)

#### Project Detail (1 dead)
- ❌ **Privacy toggle** (Public/Private) - calls Alert, doesn't persist

### Console Errors (3 recurring)
```
Failed to load resource: net::ERR_NAME_NOT_RESOLVED
```
- Appears on intro, sign-in, home screens
- Likely external font/asset loading failures

---

## 2. End-to-End Flows Analysis

### Flow 1: Sign-In → Consent → Onboarding
**Status:** ⚠️ **Partially Works**

**Mock Mode:**
1. ✅ User sees intro carousel (3 pages)
2. ✅ User clicks "Get Started" → /sign-in
3. ❌ OAuth buttons disabled (no EXPO_PUBLIC_SUPABASE_URL)
4. ❌ Can't proceed without OAuth

**Real Backend:**
1. ✅ OAuth redirect to Google/Apple
2. ✅ Callback handled by `app/(auth)/callback.tsx`
3. ✅ `setSession()` called, triggers `fetchProfile()`
4. ❌ **First-time user**: No consent check → goes straight to empty home
5. ❌ **Missing**: AI consent screen never shown unless user navigates to a generation screen

**Code Path:**
- `app/(auth)/sign-in.tsx` → `signInWithOAuth()` → WebBrowser → callback
- `lib/hooks/useAIConsentCheck.ts` only runs on protected routes, not on first login

**Gaps:**
- No first-time onboarding trigger after OAuth
- AI consent should be mandatory before accessing features
- No profile completion step (display name, preferences)

---

### Flow 2: + Create → Photo → Analyze → Style → Generating → Results → Save
**Status:** ❌ **Does Not Work**

**Mock Mode:**
1. ❌ **Blocker**: No camera capture route or component
2. ❌ No photo upload implementation
3. ❌ Can manually navigate to `/editor/test-id` but no actual project
4. ✅ Style picker shows 6 styles with IsoRoom previews
5. ❌ "Generate 4 Designs" button disabled (no project data)
6. ✅ Can manually navigate to `/generating/test-id` (shows animation)
7. ✅ Can manually navigate to `/result/test-id` (shows IsoRoom placeholders)
8. ❌ Can't save or select designs (no project ID)

**Real Backend:**
1. ❌ **Missing**: Camera capture component (`expo-camera` or `expo-image-picker`)
2. ❌ **Missing**: Photo upload to `project-photos` storage bucket
3. ⚠️ `analyze-room` function exists but not called from photo capture flow
4. ⚠️ `generate-design` function exists and would be called
5. ❌ **Missing**: Realtime subscription for generation progress
6. ❌ **Missing**: Save design selection to `projects` table
7. ❌ **Missing**: XP award (+50) only triggers on function completion, no UI feedback

**Code Gaps:**
- `app/(tabs)/camera.tsx` - does not exist
- No photo upload handler in store
- `createProject()` creates record but never uploads photo
- No progress polling or Realtime channel subscription
- No "save design" action in results screen

---

### Flow 3: Find Me a Pro → Brief → Dispatch → Inbox → Thread → Quote
**Status:** ❌ **Severely Incomplete**

**Mock Mode:**
1. ✅ Vi chat "Find Me a Pro" button navigates to `/handoff/placeholder`
2. ❌ Handoff screen shows form but "Generate Project Brief" button disabled
3. ❌ No brief generation flow
4. ❌ Inbox shows empty list (mock data exists but not rendered)
5. ❌ No contractor threads or messages
6. ❌ No quote display

**Real Backend:**
1. ⚠️ `dispatch-lead` function exists
2. ❌ **Critical**: Function expects `contractors` table which doesn't exist
3. ❌ **Critical**: No contractor matching logic (mock data vs. real source)
4. ❌ **Missing**: No email notification system for contractors
5. ❌ **Missing**: No inbound email → Inbox message ingestion
6. ❌ **Missing**: No contractor response handling
7. ❌ **Missing**: No quote parsing or storage
8. ❌ **Missing**: XP award for contractor reply never triggers (TODO comment)

**Code Path:**
- `app/handoff/[id].tsx` → `dispatchLead()` in store
- `supabase/functions/dispatch-lead/index.ts` sends email via Resend
- **Missing**: Contractor profile system
- **Missing**: Message ingestion pipeline
- **Missing**: Quote structured data

---

### Flow 4: Vi Chat → Generate
**Status:** ❌ **Not Implemented**

**Mock Mode:**
1. ✅ Chat screen renders
2. ✅ Can type messages
3. ❌ "Generate Design" button is no-op
4. ❌ No chat history persistence

**Real Backend:**
1. ⚠️ `assistant-chat` function exists
2. ❌ **Never called from app** - no sendMessage handler
3. ❌ Chat messages not stored in database
4. ❌ No context about current project passed to AI
5. ❌ No way to trigger design generation from chat

**Code Gap:**
- `app/assistant-chat.tsx` has form but no submit handler
- `sendMessage()` in store is placeholder, doesn't call function
- No `chat_messages` table in schema

---

### Flow 5: Explore → Like/Save → Publish My Project
**Status:** ⚠️ **UI Only**

**Mock Mode:**
1. ✅ Explore screen shows grid
2. ❌ Empty (no public projects)
3. ❌ No like/save functionality
4. ❌ Project detail privacy toggle does nothing

**Real Backend:**
1. ❌ **Missing**: `public_designs` table query in Explore
2. ❌ **Missing**: RLS policies for public viewing
3. ⚠️ `set-project-visibility` function exists but not called
4. ❌ **Missing**: Like/save functionality (no `user_likes` table)
5. ❌ **Missing**: Feed algorithm (trending, recent, etc.)

**Code Gaps:**
- `app/(tabs)/explore.tsx` renders mock cards, doesn't query DB
- `toggleProjectPrivacy()` in store uses Alert, doesn't call function
- No like/save actions implemented

---

### Flow 6: Profile Tab
**Status:** ⚠️ **Partial**

**What Works:**
- ✅ Shows XP chip (120 XP · Lv 1 in mock)
- ✅ Shows profile info (display name, email)
- ✅ Sign Out button (though doesn't clear session in mock)

**What's Missing:**
- ❌ No project history/stats
- ❌ No achievements or badges
- ❌ No photo/avatar management
- ❌ Can't edit display name or bio
- ❌ No referral or sharing features

---

### Flow 7: Settings
**Status:** ⚠️ **UI Complete, No Persistence**

| Setting | UI | Local Storage | Supabase | Notes |
|---------|----|--------------:|----------|-------|
| Push Notifications | ✅ | ❌ | ❌ | State change only |
| Marketing Emails | ✅ | ❌ | ❌ | State change only |
| Public Projects Default | ✅ | ❌ | ❌ | State change only |
| Opt Out AI | ✅ | ❌ | ⚠️ | Calls `setPrivacyOptOut()`, updates `profiles.privacy_opt_out` |
| Reduce Motion | ✅ | ✅ | ❌ | Stored in Zustand + AsyncStorage |
| Sign Out | ✅ | ⚠️ | ✅ | Calls `supabase.auth.signOut()` |
| Delete Account | ❌ | - | ⚠️ | Button missing, function exists |
| Data Export | ❌ | - | ❌ | No UI, no function |

**Gaps:**
- Most settings are cosmetic toggles with no persistence
- Delete account UI missing (function exists at `supabase/functions/delete-account/`)
- Data export request not implemented (GDPR compliance risk)

---

### Flow 8: Daily Limit
**Status:** ✅ **Works**

1. ✅ Error screen shown when rate limit hit
2. ✅ "Back to Home" button navigates to /(tabs)/
3. ⚠️ **Missing**: Actual rate limiting logic in backend
4. ❌ **Missing**: Limit reset timer/countdown
5. ❌ **Missing**: Upgrade to premium flow

---

## 3. Data Storage Audit

### User Profile Data

| Data | Mock Mode | Real Mode | Persisted? | Notes |
|------|-----------|-----------|------------|-------|
| User ID | Zustand | `auth.users` | ✅ | Supabase Auth |
| Email | Zustand | `auth.users` | ✅ | Supabase Auth |
| Display Name | Zustand (hardcoded "Elimar") | `profiles.display_name` | ✅ | RLS enabled |
| Photo URL | Zustand (null) | `profiles.photo_url` | ✅ | URL to storage bucket |
| XP | Zustand (120) | `user_xp` view | ✅ | Computed from `xp_events` |
| Level | Zustand (1) | `user_xp` view | ✅ | Computed from `xp_events` |
| Privacy Opt-Out | Zustand | `profiles.privacy_opt_out` | ✅ | RLS enabled |
| Reduce Motion | Zustand + AsyncStorage | - | ⚠️ | **Lost on reinstall** (no DB) |
| AI Consent | AsyncStorage | - | ⚠️ | **Lost on reinstall** (no `user_consents` table) |

### Project Data

| Data | Mock Mode | Real Mode | Persisted? | Notes |
|------|-----------|-----------|------------|-------|
| Projects List | Zustand (mock array) | `projects` table | ✅ | RLS enabled |
| Original Photo | - | `project-photos` bucket | ⚠️ | **Bucket not created** |
| Room Analysis | Zustand | `projects.room_analysis` | ✅ | JSON column |
| Selected Style | Zustand | `projects.selected_style` | ✅ | String column |
| Generated Designs | Zustand (placeholders) | `projects.generated_image_urls` | ✅ | Array column |
| Selected Design | Zustand | `projects.selected_generation_url` | ✅ | String column |
| Lead Info | Zustand | `projects.lead_info` | ✅ | JSON column |
| Public/Private | Zustand | `projects.is_public` | ✅ | Boolean |

### Chat & Communication

| Data | Mock Mode | Real Mode | Persisted? | Notes |
|------|-----------|-----------|------------|-------|
| Vi Chat Messages | - | - | ❌ | **No `chat_messages` table** |
| Contractor Threads | Mock array | - | ❌ | **No `contractor_threads` table** |
| Contractor Messages | - | - | ❌ | **No `messages` table** |
| Quotes | - | - | ❌ | **No `quotes` table** |

### XP & Gamification

| Data | Mock Mode | Real Mode | Persisted? | Notes |
|------|-----------|-----------|------------|-------|
| XP Events | - | `xp_events` table | ✅ | With unique constraint |
| Total XP | Computed | `user_xp` view | ✅ | SUM of events |
| Level | Computed | `user_xp` view | ✅ | Formula: `xp / 200 + 1` |
| Achievements | - | - | ❌ | **No achievements system** |

### Compliance & Legal

| Data | Mock Mode | Real Mode | Persisted? | Notes |
|------|-----------|-----------|------------|-------|
| Privacy Policy Acceptance | AsyncStorage | `user_consents` | ⚠️ | Table exists but not used |
| Terms Acceptance | AsyncStorage | `user_consents` | ⚠️ | Table exists but not used |
| AI Consent | AsyncStorage | `user_consents` | ⚠️ | Table exists but not used |
| Data Export Requests | - | `data_export_requests` | ⚠️ | Table exists but no UI |
| Account Deletions | - | `account_deletion_requests` | ⚠️ | Table exists, function exists, no UI |

### Storage Buckets

**Defined in migrations:**
- ✅ `project-photos` - For original room photos (RLS: owner-only read/write)
- ✅ `public-designs` - For generated designs (RLS: public read, service-only write per `00005`)

**Missing:**
- ❌ Profile photos bucket
- ❌ Chat attachments bucket
- ❌ Quote/invoice documents bucket

---

## 4. Backend Integration Gaps

### Edge Functions Status

| Function | File | Called From App? | Tested? | Status |
|----------|------|------------------|---------|--------|
| `analyze-room` | ✅ | ✅ Yes (`uploadPhoto()` in store) | ❌ | Ready |
| `generate-design` | ✅ | ✅ Yes (`generateDesign()` in store) | ❌ | Ready |
| `assistant-chat` | ✅ | ❌ No | ❌ | Not Wired |
| `dispatch-lead` | ✅ | ⚠️ Stubbed (`dispatchLead()` placeholder) | ❌ | Needs Work |
| `set-project-visibility` | ✅ | ❌ No | ❌ | Not Wired |
| `delete-account` | ✅ | ❌ No | ❌ | Not Wired |
| `unsubscribe` | ✅ | ❌ No | ❌ | Not Wired |

### Function Audit Details

#### ✅ `analyze-room`
- **Purpose**: Analyze uploaded room photo with Gemini vision model
- **Called**: Yes, from `uploadPhoto()` in store
- **Returns**: Room type, current style, sqft estimate, key elements
- **Status**: Ready to use

#### ✅ `generate-design`
- **Purpose**: Generate 4 design variations with Imagen
- **Called**: Yes, from `generateDesign()` in store
- **Awards**: +50 XP on completion
- **Status**: Ready to use
- **Gap**: No progress updates (should use Realtime channels)

#### ⚠️ `assistant-chat`
- **Purpose**: Chat with Vi (Claude) about design ideas
- **Called**: No - `sendMessage()` in store is empty
- **Status**: Function complete but not wired to UI
- **Gap**: No message persistence

#### ❌ `dispatch-lead`
- **Purpose**: Match user with contractors and send notifications
- **Called**: Stub only
- **Critical Issues**:
  - Expects `contractors` table that doesn't exist
  - Mock contractors hardcoded in function
  - No real contractor database or API integration
  - Email via Resend but no inbound message handling
  - TODO: Award XP when contractor replies (not implemented)
- **Status**: Needs substantial work

#### ❌ `set-project-visibility`
- **Purpose**: Toggle project public/private
- **Called**: No - `toggleProjectPrivacy()` uses Alert
- **Status**: Ready but not wired

#### ❌ `delete-account`
- **Purpose**: Delete user account and all data (GDPR)
- **Called**: No - no UI button
- **Status**: Function ready, needs UI

#### ❌ `unsubscribe`
- **Purpose**: Unsubscribe from marketing emails
- **Called**: No
- **Status**: Function ready, needs link in emails

### Migrations Status

**Files:**
1. ✅ `00001_initial_schema.sql` - Core tables (profiles, projects)
2. ✅ `00002_storage_buckets.sql` - Storage buckets + RLS
3. ✅ `00003_compliance_tables.sql` - Consents, export requests, deletion requests
4. ✅ `00004_storage_privacy.sql` - Storage RLS policies
5. ✅ `00005_public_designs_service_only.sql` - Lock down public-designs bucket
6. ✅ `00006_xp_system.sql` - XP events, view, RPC

**Testing Status:**
- ❌ **Never applied to local Supabase instance**
- ❌ **Never tested with `supabase start`**
- ❌ **No CI/CD migration testing**
- ⚠️ **Risk**: Migrations may fail in production

**Recommendation**: Test migrations locally before production deploy.

### Missing Backend Features

#### 1. Realtime Updates
- ❌ No Realtime channel subscriptions
- ❌ Design generation progress not pushed to client
- ❌ New contractor messages don't trigger UI updates
- ❌ No presence indicators

#### 2. Push Notifications
- ❌ No Expo push token registration
- ❌ No notification sending service
- ❌ Settings toggle exists but does nothing

#### 3. Contractor System
- ❌ No contractor database or API
- ❌ No contractor matching algorithm
- ❌ No quote ingestion pipeline
- ❌ Mock contractors hardcoded in `dispatch-lead` function

#### 4. Public Feed
- ❌ No algorithm for Explore feed
- ❌ No like/save system
- ❌ No search or filtering
- ❌ `public_designs` table exists but not queried

#### 5. Rate Limiting
- ❌ No actual rate limit enforcement
- ❌ Error screen exists but never triggered
- ❌ No premium/paid tier bypass

---

## 5. TODO/FIXME/Mock Audit

### Explicit TODOs Found

1. **supabase/functions/dispatch-lead/index.ts:279**
   ```typescript
   // TODO: Award XP when contractor replies
   ```
   **Impact**: Missing gamification trigger

### Mock-Only Code

#### High Priority (Blocking MVP)

1. **lib/store.ts:202** - `fetchProjects()`
   ```typescript
   if (!userId && __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
     const mockProjects: Project[] = [...]
   ```
   - **Impact**: All 3 mock projects in dev mode, no actual project data flow

2. **lib/store.ts:300** - `fetchInbox()`
   ```typescript
   if (!userId && __DEV__ && process.env.EXPO_PUBLIC_DEV_MOCK_SESSION === "true") {
     const mockThreads: ContractorThread[] = [...]
   ```
   - **Impact**: Mock contractor threads, no real message system

3. **app/(tabs)/explore.tsx** - Mock cards hardcoded
   - **Impact**: Explore never queries `public_designs` table

4. **app/project/[id].tsx:30** - Placeholder designs
   ```typescript
   const DESIGNS = Array.from({ length: 6 }, (_, i) => ({ ... }))
   ```
   - **Impact**: Project detail shows fake designs, not actual generations

#### Medium Priority

5. **lib/store.ts:38** - Mock session setup
   - Creates fake session in dev mode
   - Real OAuth works but mock mode skips all auth

6. **supabase/functions/dispatch-lead/index.ts** - Mock contractors
   ```typescript
   const contractors = [
     { name: "ABC Contractors", email: "demo@example.com", ... },
     ...
   ]
   ```
   - **Impact**: No real contractor integration

### Incomplete Implementations

1. **app/assistant-chat.tsx** - Chat form has no submit handler
2. **lib/store.ts** - `sendMessage()` is empty stub
3. **lib/store.ts** - `dispatchLead()` is placeholder
4. **lib/store.ts** - `toggleProjectPrivacy()` uses Alert, no actual update
5. **app/handoff/[id].tsx** - Form present but submit button disabled

---

## 6. MVP Completion Checklist

### Front End (App)

#### Critical (Must Have for MVP) - 8 items

| Task | Effort | Description |
|------|--------|-------------|
| **Camera Capture Flow** | L | Implement photo capture with expo-image-picker, upload to storage, create project |
| **Project Creation** | M | Wire camera → analyze → create project record with photo |
| **Design Generation Flow** | M | Enable "Generate 4 Designs" button, call function, show progress |
| **Design Selection & Save** | S | Allow user to tap design, mark as selected, save to DB |
| **OAuth Sign-In (Real)** | S | Remove mock session guard, test Google/Apple OAuth end-to-end |
| **Vi Chat Wiring** | M | Connect chat form to `assistant-chat` function, persist messages |
| **Settings Persistence** | M | Save all toggle states to DB (notifications, marketing, public default) |
| **Profile Tab Content** | M | Show user's projects, stats, achievements; add edit profile |

#### Important (Should Have) - 6 items

| Task | Effort | Description |
|------|--------|-------------|
| **Inbox Real Data** | L | Replace mock threads with queries to `contractor_threads` + `messages` tables |
| **Contractor Thread View** | M | Show full message thread, typing indicator, send replies |
| **Explore Feed Query** | S | Query `public_designs` table, show actual public projects |
| **Like/Save System** | M | Add like button, save to `user_likes` table, filter by liked |
| **Project Visibility Toggle** | S | Wire toggle to `set-project-visibility` function |
| **Delete Account UI** | S | Add button in Settings, confirm modal, call function |

#### Nice to Have - 4 items

| Task | Effort | Description |
|------|--------|-------------|
| **Realtime Progress** | M | Subscribe to Realtime channel for design generation updates |
| **Push Notifications** | M | Register Expo push token, show permission prompt |
| **Data Export Request** | S | Add button to request data export (GDPR) |
| **Daily Limit UI** | S | Show remaining renders count, countdown to reset |

### Back End (Supabase)

#### Critical (Must Have for MVP) - 7 items

| Task | Effort | Description |
|------|--------|-------------|
| **Contractor Database** | L | Design + implement contractor matching system (DB or API integration) |
| **Message Ingestion** | L | Parse inbound emails from contractors → insert into `messages` table |
| **Quote Structure** | M | Define quote schema, parse from emails, store in `quotes` table |
| **Migration Testing** | M | `supabase start` locally, apply all 6 migrations, verify schema |
| **Storage Bucket Creation** | S | Ensure `project-photos` and `public-designs` buckets exist in prod |
| **Chat Messages Table** | S | Create `chat_messages` table with RLS, wire to assistant-chat function |
| **RLS Policy Audit** | M | Review all RLS policies, test with non-owner user accounts |

#### Important (Should Have) - 5 items

| Task | Effort | Description |
|------|--------|-------------|
| **Contractor Reply XP** | S | Implement TODO in dispatch-lead, award +30 XP on reply |
| **Rate Limiting** | M | Add usage tracking, enforce daily limits, return 429 errors |
| **Public Feed Algorithm** | M | Implement trending/recent sort, pagination, search |
| **Realtime Channels** | M | Set up channels for design progress, new messages, quotes |
| **Consent Migration** | S | Populate `user_consents` table on first login, use instead of AsyncStorage |

#### Nice to Have - 3 items

| Task | Effort | Description |
|------|--------|-------------|
| **Push Notification Service** | M | Cloud Function to send Expo push notifications on events |
| **Data Export Pipeline** | M | Generate ZIP of user data, upload to storage, email link |
| **Analytics & Monitoring** | S | Add observability (Sentry, LogRocket, etc.) |

---

## 7. Production Deployment Gaps

### Infrastructure

- ❌ No environment variables documented (.env.example)
- ❌ No deployment guide or CI/CD
- ❌ Supabase project not provisioned (needs project ID)
- ❌ Storage buckets not created
- ❌ Edge Functions not deployed
- ❌ Migrations not applied

### Security

- ⚠️ RLS policies exist but untested with real users
- ⚠️ Service role key exposed in Edge Functions (expected)
- ❌ No rate limiting on expensive operations
- ❌ No abuse prevention (spam, bot detection)

### Compliance

- ⚠️ Consent tables exist but not used (AsyncStorage instead)
- ⚠️ Data export function exists but no UI
- ❌ No privacy policy or terms of service URLs set
- ❌ No cookie consent banner (web)

### Monitoring

- ❌ No error tracking (Sentry, Bugsnag)
- ❌ No analytics (Amplitude, Mixpanel)
- ❌ No performance monitoring
- ❌ No user feedback mechanism

---

## 8. Risk Assessment

### High Risk (Blocking Launch)

1. **No Camera/Photo Flow** - Core feature completely missing
2. **No Contractor System** - Main value prop not real
3. **Mock Data Everywhere** - App feels like a prototype, not a product
4. **Untested Migrations** - High chance of DB failure in production

### Medium Risk (User Frustration)

5. **83% Dead Buttons** - Most interactions do nothing
6. **No Data Persistence** - Everything lost on app restart
7. **No Error Handling** - Function failures show blank screens
8. **No Realtime Updates** - User must refresh manually

### Low Risk (Post-Launch Fix)

9. **Missing Analytics** - Can't measure success
10. **No Push Notifications** - Can add later
11. **Limited Profile Features** - Not essential for MVP

---

## 9. Recommended MVP Scope

### Minimum Viable Product (2-3 weeks, 1-2 engineers)

**Core Flow Only:**
1. OAuth sign-in (Google/Apple)
2. Photo capture → upload → analyze
3. Style selection → generate 4 designs
4. Select design → view results
5. Basic profile (view only)

**Cut from MVP:**
- Contractor matching (add in v1.1)
- Vi chat (add in v1.1)
- Explore feed (add in v1.2)
- XP/gamification (keep UI, verify later)

**Rationale:**
- Focus on "Design Your Space" core loop
- Defer "Find a Pro" until contractor partnerships secured
- Ship fast, iterate based on real user feedback

---

## 9. Designer & Compliance Review Findings

### Verified Issues from Design Review

#### A. Inbox Contractor Tap - No Conversation Screen
**Code Location:** `app/(tabs)/inbox.tsx:164`
```typescript
<Pressable style={styles.thread}>  // No onPress handler
```

**Current State:**
- ✅ Inbox shows list of contractor threads
- ❌ Pressable has no `onPress` prop
- ❌ No conversation/thread detail screen exists
- ⚠️ Mock data exists (`PLACEHOLDER_THREADS`) but can't be opened

**What's Missing:**
1. Route: `app/inbox/[threadId].tsx` - Conversation screen
2. Components needed:
   - Message bubble list (user vs. contractor messages)
   - Quote card component (attached quotes with accept/decline)
   - Reply text input with send button
   - Report/Block action menu
3. Data layer:
   - `contractor_threads` table (doesn't exist)
   - `messages` table (doesn't exist)
   - `quotes` table (doesn't exist)

**Effort: L** (Large - requires new screen, 3 new tables, message persistence)

---

#### B. Explore Design Tap - No Detail View
**Code Location:** `app/(tabs)/explore.tsx:66`
```typescript
<Pressable style={styles.card}>  // No onPress handler
```

**Current State:**
- ✅ Explore shows grid of designs
- ❌ Card Pressable has no `onPress` prop
- ❌ No design detail screen exists
- ⚠️ Report button calls `handleReport()` but empty Alert options (lines 34-36)
- ⚠️ Like counts are random: `Math.floor(Math.random() * 500) + 50` (line 22)

**What's Missing:**
1. Route: `app/explore/[designId].tsx` - Design detail view
2. Features needed:
   - Full-size design image
   - Project description and metadata
   - Save/bookmark button → `user_saves` table
   - Remix button → create new project with same style
   - Report button → use existing `ReportModal`
3. Data fixes:
   - Replace random like counts with real `COUNT(likes.id)` query
   - Add `user_likes` table
   - Add `user_saves` table

**Effort: M** (Medium - new screen, 2 new tables, query updates)

---

#### C. Profile Tab - Dead Rows and Missing Gamification
**Code Location:** `app/(tabs)/profile.tsx:21-27`

**Current State:**
- ❌ **"Edit Profile"** (line 22) - `route: null`, does nothing
- ❌ **"Payment Methods"** (line 24) - `route: null`, **MUST BE REMOVED**
- ❌ **"My Properties"** (line 25) - `route: null`, shows fake badge "3"
- ❌ **"Saved Designs"** (line 26) - `route: null`, shows fake badge "12"
- ❌ **No level/XP bar** - Header shows only avatar, name, email
- ❌ **No badges** - Gamification system missing from UI
- ❌ **No quests** - Quest system not implemented

**What's Missing:**
1. Remove "Payment Methods" row entirely (no payment system in MVP)
2. Wire "Edit Profile" → new route `app/profile/edit.tsx`
3. Wire "My Properties" → query user's projects, real count
4. Wire "Saved Designs" → query `user_saves` table, real count
5. Add XP bar component to header (data already exists from `user_xp` view)
6. Design + implement badges system (table + UI)
7. Design + implement quests system (table + UI)

**Effort Breakdown:**
- Remove Payment Methods: **S** (Small - delete one row)
- Edit Profile screen: **M** (Medium - form with avatar upload, name edit)
- Wire Properties/Saved counts: **S** (Small - query + display)
- Add XP bar to header: **S** (Small - component already styled elsewhere)
- Badges system: **L** (Large - schema, logic, UI)
- Quests system: **L** (Large - schema, logic, UI)

---

#### D. Home Empty State - No IsoRoom
**Code Location:** `app/(tabs)/index.tsx:97-107`

**Current State:**
- ✅ Empty state shows when `projects.length === 0`
- ⚠️ Uses generic `EmptyState` component with `icon="home-outline"`
- ⚠️ Button navigates to `/(tabs)/camera` which doesn't exist
- ❌ No IsoRoom preview as specified in mockup

**What's Missing:**
1. Replace `<EmptyState icon="home-outline" />` with custom layout
2. Add `<IsoRoom palette="modern" size={200} />` above text
3. Update button to work with actual camera flow (or placeholder)

**Effort: S** (Small - swap component, add IsoRoom)

---

### Verified Issues from Compliance Review

#### E. Explore Report Options - Empty Functions
**Code Location:** `app/(tabs)/explore.tsx:29-38`

**Current State:**
```typescript
const handleReport = (id: string) => {
  Alert.alert(
    "Report Design",
    "Why are you reporting this design?",
    [
      { text: "Inappropriate content", onPress: () => {} },  // ❌ Empty
      { text: "Spam or misleading", onPress: () => {} },    // ❌ Empty
      { text: "Copyright violation", onPress: () => {} },   // ❌ Empty
      { text: "Cancel", style: "cancel" },
    ]
  );
};
```

**What's Missing:**
- ✅ `ReportModal` component exists and is fully functional (`components/ReportModal.tsx`)
- ✅ `reports` table exists with RLS (`supabase/migrations/00003_compliance_tables.sql:16`)
- ✅ `submitReport()` in store works (`lib/store.ts:602`)
- ❌ Explore doesn't import or use `ReportModal`
- ❌ Uses Alert with empty callbacks instead

**Fix Required:**
1. Import `ReportModal` from `@/components`
2. Add state: `const [reportModalVisible, setReportModalVisible] = useState(false)`
3. Add state: `const [reportDesignId, setReportDesignId] = useState("")`
4. Replace `Alert.alert()` with modal open: `setReportDesignId(id); setReportModalVisible(true);`
5. Render modal: `<ReportModal visible={reportModalVisible} onClose={...} type="design" itemId={reportDesignId} />`

**Effort: S** (Small - wire existing modal, no new code needed)

---

#### F. Block Functionality - Console.log Only
**Code Location:** `app/(tabs)/inbox.tsx:56-58`

**Current State:**
```typescript
{
  text: "Block",
  onPress: () => {
    console.log("Block contractor:", contractorId);  // ❌ Only logs
    Alert.alert("Blocked", `You have blocked ${contractorName}`);
  },
  style: "destructive",
},
```

**What's Missing:**
1. **Database:** No `blocks` table exists (must be created)
2. **RLS:** Need policies to enforce blocking
3. **Filtering:** Inbox and Explore must filter out blocked users
4. **Mutual blocks:** User can block contractor, contractor can block user (GDPR right to refuse service)

**Schema Needed:**
```sql
create table public.blocks (
  id uuid primary key default uuid_generate_v4(),
  blocker_id uuid references public.profiles(id) on delete cascade not null,
  blocked_id uuid not null,  -- Can be user ID or contractor ID
  blocked_type text not null check (blocked_type in ('user', 'contractor')),
  created_at timestamptz not null default now(),
  unique(blocker_id, blocked_id, blocked_type)
);

create index idx_blocks_blocker on public.blocks(blocker_id);
create index idx_blocks_blocked on public.blocks(blocked_id, blocked_type);
```

**Implementation:**
1. Add migration: `00007_blocks_table.sql`
2. Add RLS policies (user can insert own blocks, view own blocks)
3. Update Inbox query: `WHERE contractor_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid())`
4. Update Explore query: `WHERE user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = auth.uid())`
5. Wire block button to `supabase.from("blocks").insert()`

**Effort: M** (Medium - new table, migration, RLS, query updates)

---

#### G. Moderation System - No Admin Path
**Code Location:** Reports saved to `reports` table, but no action taken

**Current State:**
- ✅ Users can submit reports via `ReportModal`
- ✅ Reports saved to `reports` table with user_id, target_type, target_id, reason
- ❌ No admin interface to review reports
- ❌ No way to hide/remove reported content
- ❌ No way to ban users
- ❌ Reported designs still show in Explore
- ❌ Reported messages still show in Inbox

**What's Missing - Two Options:**

**Option A: Service-Role Edge Function (Minimal)**
- Function: `supabase/functions/moderate/index.ts`
- Authenticated via service-role key
- Endpoints:
  - `POST /moderate/hide-design` - Sets `projects.is_hidden = true`
  - `POST /moderate/ban-user` - Sets `profiles.is_banned = true`
  - `GET /moderate/reports` - Lists pending reports
- Access control: Hardcoded admin user IDs in function
- **Effort: M** (Medium - new function, new columns, RLS updates)

**Option B: Protected Admin Screen (Better UX)**
- Route: `app/admin/reports.tsx` (protected by admin RLS policy)
- Features:
  - List all reports grouped by status
  - View reported content inline
  - One-click actions: Hide, Ban, Dismiss
  - Audit log of moderation actions
- Database:
  - Add `is_hidden` column to `projects`
  - Add `is_banned` column to `profiles`
  - Add `moderation_log` table
  - Add `admin` role or `is_admin` flag on `profiles`
- **Effort: L** (Large - full admin UI, permissions, audit trail)

**Recommended:** Start with Option A (edge function) for MVP, add Option B post-launch.

**Effort: M** (for Option A)

---

#### H. Contractors Table - Empty, No Seed Data
**Code Location:** 
- Schema: `supabase/migrations/00001_initial_schema.sql:80`
- Function: `supabase/functions/dispatch-lead/index.ts` (hardcoded mock contractors)

**Current State:**
- ✅ Table exists with proper schema (business_name, email, phone, zip, specialties, rating)
- ✅ RLS policy: authenticated users can read active contractors
- ❌ Table is empty (no `INSERT` statements in migrations)
- ❌ `dispatch-lead` function uses hardcoded array of 5 mock contractors
- ⚠️ **Decision pending:** How to source contractors

**Two Sourcing Options:**

**Option 1: California Public License Board Data**
**Pros:**
- Free, public data (contractors.cslb.ca.gov)
- 400,000+ licensed contractors
- Verified credentials
- Legal to use for business purposes

**Cons:**
- No email addresses (CSLB doesn't publish emails)
- Phone numbers are business phones (many outdated)
- No opt-in consent (cold outreach)
- Requires robust unsubscribe mechanism
- Higher spam risk / deliverability issues

**What's Needed:**
1. Scrape CSLB data (or buy cleaned dataset)
2. ETL pipeline: CSV → Supabase `contractors` table
3. Email append service (Clearbit, Hunter.io) to find emails
4. Strong unsubscribe system (already exists: `contractor_optouts` table)
5. Comply with CAN-SPAM (clear sender ID, unsubscribe link, privacy notice)
6. **Privacy notice for contractors** (see below)
7. Monitor deliverability and unsubscribe rate

**Effort: L** (Large - data acquisition, email append, compliance)

---

**Option 2: Contractor Self-Signup**
**Pros:**
- Explicit opt-in (no spam risk)
- Fresh, accurate contact info
- Contractors can set preferences (zip range, specialties, availability)
- Higher engagement (they want leads)
- GDPR/CCPA compliant by design

**Cons:**
- Requires separate contractor-facing app or portal
- Cold-start problem (need contractors before users)
- May need incentives (free trial, referral bonus)

**What's Needed:**
1. Contractor signup flow:
   - Landing page (visionbuild.app/contractors)
   - Form: business_name, email, phone, zip, specialties
   - Email verification
   - Profile setup (photos, bio, portfolio)
2. Contractor dashboard:
   - View incoming leads
   - Accept/decline leads
   - Reply to users
   - View ratings/reviews
3. Admin approval workflow (prevent spam signups)
4. Marketing to recruit contractors

**Effort: XL** (Extra Large - separate app, marketing, chicken-egg problem)

---

**Recommended for MVP:** Neither option is ready. Current approach:
1. Keep mock contractors in `dispatch-lead` function for MVP
2. Manually add 10-20 real contractors to DB (friends, partners, test accounts)
3. Post-MVP: Decide on Option 1 vs. Option 2 based on user feedback

**Effort to Add Manual Seed Data: S** (Small - write INSERT statements)

---

#### I. Inbound Contractor Replies - No Webhook
**Code Location:** `supabase/functions/dispatch-lead/index.ts` sends email via Resend

**Current State:**
- ✅ Outbound email works (Resend API)
- ✅ Email includes user's project details
- ❌ Replies go to contractor's email thread
- ❌ No way to ingest replies into app
- ❌ User never sees contractor responses in Inbox
- ❌ `messages` table doesn't exist

**What's Missing:**

**1. Resend Inbound Webhook**
- Set up Resend inbound route (e.g., `replies@mail.visionbuild.app`)
- Configure webhook to POST to: `https://<project>.supabase.co/functions/v1/ingest-message`
- Parse inbound email:
  - Extract sender (contractor email)
  - Extract recipient (match to user via `outreach_log.provider_message_id`)
  - Extract body (strip quoted text, HTML)
  - Detect quote (regex for $X,XXX-$Y,YYY patterns)

**2. New Tables**
```sql
-- Messages between users and contractors
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.contractor_threads(id) not null,
  sender_type text not null check (sender_type in ('user', 'contractor')),
  sender_id uuid not null,  -- user_id or contractor_id
  body text not null,
  created_at timestamptz not null default now()
);

-- Threads group messages by project + contractor
create table public.contractor_threads (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) not null,
  user_id uuid references public.profiles(id) not null,
  contractor_id uuid references public.contractors(id) not null,
  created_at timestamptz not null default now(),
  unique(project_id, contractor_id)
);

-- Quotes extracted from messages
create table public.quotes (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references public.contractor_threads(id) not null,
  message_id uuid references public.messages(id) not null,
  low_estimate numeric(10,2),
  high_estimate numeric(10,2),
  timeline_days int,
  notes text,
  created_at timestamptz not null default now()
);
```

**3. Edge Function: `ingest-message`**
- Verify Resend webhook signature
- Parse email
- Look up thread by contractor email + project
- Create `message` record
- If quote detected, create `quote` record
- Award XP (+30) on first contractor reply (implement TODO in dispatch-lead)
- Send push notification to user (if enabled)

**Effort: L** (Large - webhook setup, 3 new tables, parsing logic, quote extraction)

---

#### J. Privacy Notice for Contractors
**Code Location:** `supabase/functions/dispatch-lead/index.ts` - email template

**Current State:**
- ❌ No privacy notice in outbound emails
- ⚠️ GDPR/CCPA violation: sharing user data without informing contractors

**What's Needed:**
Email footer must include:
```
---
VisionBuild Privacy Notice:
This email contains a lead from a homeowner seeking renovation services.
By responding, you agree to:
- Use this information solely to provide a quote
- Not share or sell this contact information
- Delete all data if the project is closed or upon request

To opt out of future leads: [unsubscribe link]
Contractor data handling: visionbuild.app/contractor-privacy
```

**Implementation:**
1. Add footer to email template in `dispatch-lead/index.ts`
2. Create `app/contractor-privacy.tsx` page explaining:
   - What data we share (project details, user first name, location)
   - What data we don't share (full address until they're selected)
   - Contractor's right to opt out
   - Deletion upon request
3. Wire unsubscribe link to existing `unsubscribe` function
4. Update main Privacy Policy to include contractor data handling

**Effort: S** (Small - email template update, one new page)

---

#### K. Contractor Data Deletion
**Code Location:** No deletion logic exists

**Current State:**
- ✅ User data deletion exists (`supabase/functions/delete-account/index.ts`)
- ❌ Contractor deletion not implemented
- ⚠️ **Compliance gap:** GDPR Article 17 (Right to Erasure) applies to contractors too

**What's Needed:**

**For User Deletion (already implemented):**
- ✅ Deletes user profile
- ✅ Cascades to projects, leads, reports, consents, etc.
- ⚠️ **Missing:** Should also delete contractor data from `outreach_log`

**For Contractor Deletion (new):**
- Contractors who were contacted must be able to request deletion
- Need `supabase/functions/delete-contractor-data/index.ts`
- Delete or anonymize:
  - `contractors` record (if self-signup model)
  - `outreach_log` records (or anonymize email)
  - `leads` records
  - `messages` in threads
  - `quotes`
- Keep audit trail: replace with `[deleted contractor]` in UI

**Implementation:**
1. Add contractor deletion endpoint
2. Update user deletion to also anonymize `outreach_log.contractor_email`
3. Add "Delete my data" link in contractor email footers
4. Create `app/contractor-delete-request.tsx` form

**Effort: M** (Medium - new function, cascade logic, anonymization)

---

### Updated Priority List with Designer & Compliance Findings

#### Front End - Critical (Must Have)

| # | Task | Effort | Source | Description |
|---|------|--------|--------|-------------|
| 1 | **Camera Capture Flow** | L | Original | Implement photo capture with expo-image-picker, upload to storage, create project |
| 2 | **Contractor Conversation Screen** | L | Designer | New route `app/inbox/[threadId].tsx` with message bubbles, quote cards, reply box, Report/Block |
| 3 | **Explore Design Detail View** | M | Designer | New route `app/explore/[designId].tsx` with full image, Save, Remix, Report |
| 4 | **Project Creation** | M | Original | Wire camera → analyze → create project record with photo |
| 5 | **Design Generation Flow** | M | Original | Enable "Generate 4 Designs" button, call function, show progress |
| 6 | **Design Selection & Save** | S | Original | Allow user to tap design, mark as selected, save to DB |
| 7 | **Fix Home Empty State** | S | Designer | Add IsoRoom preview to empty state instead of icon |
| 8 | **Wire Explore Report** | S | Compliance | Replace Alert with existing ReportModal component |
| 9 | **Remove Payment Methods** | S | Designer | Delete "Payment Methods" row from Profile tab |
| 10 | **Fix Profile Properties/Saved Counts** | S | Designer | Query real counts instead of hardcoded "3" and "12" |
| 11 | **Add Profile XP Bar** | S | Designer | Add level/XP bar component to Profile header |
| 12 | **OAuth Sign-In (Real)** | S | Original | Remove mock session guard, test Google/Apple OAuth end-to-end |

#### Front End - Important (Should Have)

| # | Task | Effort | Source | Description |
|---|------|--------|-------------|
| 13 | **Block System UI** | M | Compliance | Wire block button to save to `blocks` table, filter blocked content |
| 14 | **Inbox Real Data** | L | Original | Replace mock threads with queries to `contractor_threads` + `messages` tables |
| 15 | **Edit Profile Screen** | M | Designer | New route `app/profile/edit.tsx` with avatar upload, name edit |
| 16 | **Vi Chat Wiring** | M | Original | Connect chat form to `assistant-chat` function, persist messages |
| 17 | **Settings Persistence** | M | Original | Save all toggle states to DB (notifications, marketing, public default) |
| 18 | **Like/Save System** | M | Original | Add like button, save to `user_likes` table, filter by liked |
| 19 | **Project Visibility Toggle** | S | Original | Wire toggle to `set-project-visibility` function |
| 20 | **Delete Account UI** | S | Original | Add button in Settings, confirm modal, call function |
| 21 | **Fix Explore Like Counts** | S | Designer | Replace random counts with real query or show zero |

#### Front End - Nice to Have

| # | Task | Effort | Source | Description |
|---|------|--------|-------------|
| 22 | **Badges System** | L | Designer | Design + implement badges schema, award logic, Profile UI |
| 23 | **Quests System** | L | Designer | Design + implement quests schema, tracking logic, Profile UI |
| 24 | **Realtime Progress** | M | Original | Subscribe to Realtime channel for design generation updates |
| 25 | **Push Notifications** | M | Original | Register Expo push token, show permission prompt |
| 26 | **Data Export Request** | S | Original | Add button to request data export (GDPR) |
| 27 | **Daily Limit UI** | S | Original | Show remaining renders count, countdown to reset |

---

#### Back End - Critical (Must Have)

| # | Task | Effort | Source | Description |
|---|------|--------|-------------|
| 28 | **Contractor Message Ingestion** | L | Compliance | Resend inbound webhook → parse emails → insert into `messages` table |
| 29 | **Moderation System (Edge Function)** | M | Compliance | Service-role function to hide designs, ban users, review reports |
| 30 | **Blocks Table** | M | Compliance | New table + RLS + filter blocked users from Inbox/Explore |
| 31 | **Contractor Threads Table** | M | Designer | New `contractor_threads` table to group messages |
| 32 | **Messages Table** | M | Designer | New `messages` table for user ↔ contractor communication |
| 33 | **Quotes Table** | M | Designer | New `quotes` table with low/high estimates, timeline |
| 34 | **Migration Testing** | M | Original | `supabase start` locally, apply all migrations, verify schema |
| 35 | **Storage Bucket Creation** | S | Original | Ensure `project-photos` and `public-designs` buckets exist in prod |
| 36 | **Chat Messages Table** | S | Original | Create `chat_messages` table with RLS, wire to assistant-chat function |
| 37 | **RLS Policy Audit** | M | Original | Review all RLS policies, test with non-owner user accounts |
| 38 | **Contractor Privacy Notice** | S | Compliance | Add footer to dispatch-lead email with privacy notice + unsubscribe |

#### Back End - Important (Should Have)

| # | Task | Effort | Source | Description |
|---|------|--------|-------------|
| 39 | **Contractor Reply XP** | S | Original | Implement TODO in dispatch-lead, award +30 XP on reply |
| 40 | **Contractor Data Deletion** | M | Compliance | Add deletion/anonymization for contractor data (GDPR) |
| 41 | **User Likes Table** | S | Designer | New `user_likes` table for liking public designs |
| 42 | **User Saves Table** | S | Designer | New `user_saves` table for bookmarking designs |
| 43 | **Contractor Manual Seed** | S | Compliance | Add 10-20 real contractor records for MVP testing |
| 44 | **Rate Limiting** | M | Original | Add usage tracking, enforce daily limits, return 429 errors |
| 45 | **Public Feed Algorithm** | M | Original | Implement trending/recent sort, pagination, search |
| 46 | **Realtime Channels** | M | Original | Set up channels for design progress, new messages, quotes |
| 47 | **Consent Migration** | S | Original | Populate `user_consents` table on first login, use instead of AsyncStorage |

#### Back End - Nice to Have

| # | Task | Effort | Source | Description |
|---|------|--------|-------------|
| 48 | **Contractor Sourcing Decision** | XL | Compliance | Decide CSLB data vs. self-signup, implement chosen path |
| 49 | **Admin Moderation UI** | L | Compliance | Protected admin screen for reviewing reports (post-MVP) |
| 50 | **Push Notification Service** | M | Original | Cloud Function to send Expo push notifications on events |
| 51 | **Data Export Pipeline** | M | Original | Generate ZIP of user data, upload to storage, email link |
| 52 | **Analytics & Monitoring** | S | Original | Add observability (Sentry, LogRocket, etc.) |

---

### Summary of Additions

**New Tasks Added:** 25
- **From Designer:** 11 tasks (conversation screen, design detail, Profile fixes, empty state)
- **From Compliance:** 14 tasks (blocks, moderation, contractor privacy, message ingestion, deletion)

**Updated Totals:**
- **Front End:** 27 tasks (was 18) - +9 tasks
- **Back End:** 25 tasks (was 15) - +10 tasks
- **Total:** 52 tasks (was 33) - +19 net new tasks

**Critical Path Extended:**
- MVP was estimated at 2.5-3 weeks
- With new findings: **3.5-4 weeks** (assuming contractor sourcing deferred)

---

## 10. Final Recommendation

**Current State:** App is a high-fidelity prototype with impressive UI but minimal working functionality.

**Path to MVP:**

**Phase 1: Foundation (1 week)**
- Implement camera capture
- Wire OAuth sign-in
- Test migrations locally
- Deploy Supabase project

**Phase 2: Core Loop (1 week)**
- Complete photo → analyze → generate flow
- Add Realtime progress updates
- Enable design selection & save
- Test end-to-end with real backend

**Phase 3: Polish (3-4 days)**
- Fix critical dead buttons
- Add error handling
- Settings persistence
- Basic profile functionality

**Phase 4: Launch Prep (2-3 days)**
- RLS testing
- Performance optimization
- Error tracking
- Analytics integration

**Total Estimated Effort:** 2.5-3 weeks for focused MVP

**Post-Launch Priority:**
1. Contractor system (partnership required)
2. Vi chat functionality
3. Explore feed
4. Push notifications
5. Rate limiting & abuse prevention

---

**Audit Completed:** October 8, 2026  
**Next Review:** After Phase 1 completion
