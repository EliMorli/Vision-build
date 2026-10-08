# Handoff Document: VisionBuild Client Flow

**Date**: October 8, 2026  
**Branch**: `cursor/visionbuild-client-flow-740f`  
**PR**: [#2](https://github.com/EliMorli/Vision-build/pull/2)

---

## ✅ COMPLETED

### Security Fixes (Priority)
All 6 security issues from review of commit d93632a have been fixed:

1. **Blocked anon INSERT attack** - Migration 00008 removes all anon/authenticated access to `account_deletion_requests`
2. **Separated GET/POST deletion** - GET validates only, POST executes. Email scanners won't trigger deletion.
3. **Fixed user lookup pagination** - Migration 00009 adds `auth.get_user_id_by_email` SECURITY DEFINER function
4. **Fixed production logging** - Token only logged in dev/staging, never in production
5. **Fixed set-project-visibility** - Never copies main_image or 'original' files; keeps full storage paths; fails loudly
6. **Repo hygiene** - Removed 39MB supabase-go binary, added to .gitignore

**Tests added**:
- `scripts/sql-tests/test-deletion-security.sql` - RLS tests
- `scripts/sql-tests/test-visibility-privacy.sql` - Privacy filter tests  
- `scripts/test-deletion-flow.ts` - Integration tests

**Web routes added**:
- `/delete-account` - Request form
- `/delete-account/confirm?token=...` - Confirmation page (GET validates, POST deletes)
- UI per spec: masked email, red button, error states

### Documentation
- ✅ `docs/BUTTONS.md` - Status tracking for all 42 buttons (7 working, 4 deferred, 30 broken)
- ✅ `docs/HANDOFF.md` - This file

### Legal Routes
- ✅ `/terms` - Renders `content/legal/terms-of-service.md` (including DRAFT line)
- ✅ `/privacy` - Renders `content/legal/privacy-policy.md`
- ✅ Registered in root layout

### Files Created/Modified
```
supabase/migrations/00008_lock_down_deletion_requests.sql
supabase/migrations/00009_auth_user_lookup_by_email.sql
supabase/functions/_shared/delete-user-data.ts
supabase/functions/delete-account/index.ts (refactored to use shared module)
supabase/functions/confirm-account-deletion/index.ts (complete rewrite: GET/POST separation)
supabase/functions/request-account-deletion/index.ts (fixed logging)
supabase/functions/set-project-visibility/index.ts (privacy fixes)
app/delete-account/index.tsx
app/delete-account/confirm.tsx
app/terms.tsx
app/privacy.tsx
app/_layout.tsx (registered new routes)
docs/BUTTONS.md
docs/HANDOFF.md
.gitignore (added supabase binaries)
scripts/sql-tests/test-deletion-security.sql
scripts/sql-tests/test-visibility-privacy.sql
scripts/test-deletion-flow.ts
```

---

## 🚧 NOT DONE (Original Task)

The original task had multiple steps. Only security fixes and documentation are complete.

### STEP 0: Local Backend
**Status**: ❌ Not attempted  
**Why**: Docker daemon failed to start (permission issues). PostgreSQL 16 installed but Supabase CLI setup not completed.  
**What's needed**:
- Either: Fix Docker permissions and run `supabase start`
- Or: Create minimal auth/storage shims for PostgreSQL 16, apply migrations, create SQL tests in `scripts/sql-tests/`
- Add `npm run dev:local` script
- Document in `docs/LOCAL_DEV.md`

### STEP 1: Core Create Loop
**Status**: ❌ Not started  
**Existing code**:
- ✅ `app/(tabs)/camera.tsx` exists and looks complete
- ✅ `expo-image-picker` already imported
- ✅ `uploadAndAnalyze()` function exists in `lib/store.ts` (lines 349-421)
- ✅ `generateDesigns()` function exists in `lib/store.ts` (lines 423-470)
- ✅ Edge functions exist: `analyze-room`, `generate-design`

**What's needed**:
1. Wire camera button in home screen to `/(tabs)/camera`
2. Test upload flow (storage bucket `room-photos` must exist)
3. Add AI mock mode:
   - Check `APP_ENV=development && AI_MOCK=true` in `supabase/functions/_shared/ai.ts`
   - Return fake analysis for analyze-room
   - Return fake image URLs for generate-design
   - Mock mode allows local testing without OpenRouter keys
4. Wire style picker to call `generateDesigns()`
5. Wire results screen to save selected design
6. Test full loop end-to-end

### STEP 2: Pass A Broken Buttons
**Status**: ❌ Not started  
**List** (from BUTTONS.md):
- ❌ AI consent saved to DB with AI_CONSENT_VERSION (currently AsyncStorage only)
- ❌ Settings toggles persist to DB (currently local state only)
- ❌ Delete Account button in Settings (function exists, UI missing)
- ❌ Sign Out in mock mode (doesn't clear session)
- ❌ Edit Profile screen (route: null)
- ❌ Vi chat saves chat_messages (sendMessage() is stub)
- ❌ Vi Generate Design starts loop (no handler)
- ❌ Visibility switch calls set-project-visibility (currently Alert)
- ❌ Explore Report uses ReportModal (currently Alert with empty callbacks)

### STEP 3: set-project-visibility Bug
**Status**: ✅ DONE (included in security fixes)

### STEP 4: Async UX
**Status**: ❌ Not started  
**What's needed**:
- Pressed state on all buttons
- Disabled + spinner while pending
- Double-tap prevention
- Readable error messages
- Empty states for: Home, Explore, Inbox, Profile
- Offline states with Retry buttons

### VERIFY Before Reporting Done
**Status**: ❌ Not started  
**Checklist**:
- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes  
- [ ] `npx expo install --check` passes
- [ ] `npm run check:models` passes
- [ ] `deno check` on all functions passes
- [ ] Update `docs/BUTTONS.md` with real counts
- [ ] Add `npm run e2e:web` Playwright test for create loop in mock mode
- [ ] Take screenshots in `e2e/screens/a2-*.png` with assertions

---

## 📊 Current Status

### Commits
1. `00df28b` - security: fix account deletion vulnerabilities (priority)
2. `f69dd7c` - feat: add web routes and tests for account deletion
3. `96b8dcd` - docs: add BUTTONS.md tracking sheet
4. `15f0e26` - feat: add /terms and /privacy routes

### Button Counts (from BUTTONS.md)
- **Total**: 42 buttons
- **Pass A** (working): 7 (17%)
- **Pass B** (deferred): 4 (10%) - contractor threads, quotes, blocks, Explore detail
- **Broken**: 30 (71%)

### Local Backend Path
Attempted Docker but failed. PostgreSQL 16 installed. Migrations not applied.

---

## 🔧 How to Continue

### Immediate Next Steps
1. **Fix camera flow**:
   - Update home screen "Start Your First Project" button to route to `/(tabs)/camera`
   - Test camera.tsx with mock Supabase or local backend
   
2. **Add AI mock mode**:
   - In `supabase/functions/_shared/ai.ts`, check for `APP_ENV=development && AI_MOCK=true`
   - Return mock data from `analyze-room` and `generate-design`
   - This allows testing without OpenRouter keys

3. **Wire existing functions**:
   - Most code already exists, just needs connections
   - Example: Vi chat form has UI but sendMessage() is empty
   - Example: Project detail has visibility toggle but calls Alert instead of function

### Testing Without Keys
The owner will plug in real keys later. Focus on:
- Code correctness (functions called with right parameters)
- Mock mode support (works locally without keys)
- Error handling (fails gracefully when keys missing)

### Before Final Push
1. Run all lints and type checks
2. Update BUTTONS.md counts
3. Add e2e test for create loop
4. Take and verify screenshots
5. Update PR description with final status

---

## 🐛 Known Issues

1. **Docker**: Can't start daemon (permission denied)
2. **Supabase Local**: Not set up
3. **Mock Mode**: Not implemented for AI functions
4. **Storage Buckets**: May not exist in local or remote instance

---

## ✅ TEST INFRASTRUCTURE COMPLETE (October 8, 2026)

### Database Tests
**Status**: ✅ COMPLETE and PASSING  
- Created `scripts/db/shim.sql` - Minimal auth/storage schema for plain PostgreSQL
- Created `scripts/db/run-tests.sh` - Full database test runner
- Created `scripts/db/post-migration-grants.sql` - Service role permissions
- Added `npm run db:test` command
- **Results**: 2/2 tests passing
  - `test-deletion-security.sql` - ✅ All 6 tests pass
  - `test-visibility-privacy.sql` - ✅ All 3 tests pass

### Function Tests
**Status**: ✅ COMPLETE and PASSING  
- Created `supabase/functions/deno.json` - Deno configuration
- Created `scripts/run-function-tests.sh` - Function test runner
- Added `supabase/functions/confirm-account-deletion/index_test.ts` - Email masking tests
- Added `npm run fn:test` command
- **Results**: All functions typecheck, 3/3 unit tests passing

### CI/CD Pipeline
**Status**: ✅ COMPLETE and GREEN  
- Created `.github/workflows/ci.yml` - Full CI pipeline
- Runs on all PRs and pushes to main/develop/cursor/** branches
- Tests run in parallel with PostgreSQL service container
- **All checks passing**:
  - ✅ Lint (0 errors, 47 warnings)
  - ✅ TypeScript check
  - ✅ Zod/Database models validation
  - ✅ Database tests (2/2 passing)
  - ✅ Function tests (3/3 passing)

### Bugs Fixed

1. **Schema Mismatch in set-project-visibility**
   - Function used `main_image`/`design_image` but schema has `original_image_url`/`selected_generation_url`
   - Fixed in commit `b5863a8`
   - Privacy filter now correctly skips original images

2. **Type Narrowing in Functions**
   - `verifyAuth()` and `verifyProjectOwnership()` return `T | Response`
   - TypeScript couldn't narrow types without explicit checks
   - Fixed in commit `a3022ca`

3. **Rate Limit Function Call**
   - `assistant-chat` called `checkRateLimit()` with 4 args but only takes 3
   - Fixed in commit `a3022ca`

4. **TypeScript Errors**
   - `profile.tsx`: Changed `design_image` → `selected_generation_url`
   - `confirm.tsx`: Fixed variable shadowing and null type issues
   - `privacy.tsx`, `terms.tsx`: Fixed color.text → color.textPrimary
   - `final-retake.js`: Fixed document reference in eval
   - Fixed in commits `56720c5`

5. **React Hooks Lint Error**
   - `delete-account/confirm.tsx` called setState synchronously in useEffect
   - Restructured to async validation inside effect with cancellation
   - Fixed in commit `2935257`

### Commits in This Pass
1. `b5863a8` - fix: correct column names in set-project-visibility and tests
2. `a3022ca` - fix: resolve TypeScript errors in functions and add tests
3. `56720c5` - feat: add CI workflow and fix TypeScript errors
4. `2935257` - fix: resolve lint error in confirm page
5. `d82a6f3` - fix: use deno from PATH in CI
6. `c18b228` - fix: remove incompatible Deno lockfile
7. `75da611` - fix: remove deno.lock from git tracking

### Test Summary
```
Database Tests: 2 passed, 2 total
Function Tests: 3 passed, 3 total (all functions typecheck)
CI Pipeline: ✅ GREEN on PR #2
```

### Command Summary
All these commands now work and pass:
```bash
npm run lint          # 0 errors, 47 warnings
npx tsc --noEmit      # 0 errors
npm run check:models  # All models valid
npm run db:test       # 2/2 passing
npm run fn:test       # 3/3 passing
```

---

## 🔐 Image URLs and Privacy (Updated October 8, 2026)

### Storage Architecture

**Private Storage (room-photos bucket):**
- All user-uploaded images and AI-generated designs live here
- Only accessible by the owning user
- Paths follow format: `<userId>/<projectId>/<filename>`

**Public Storage (public-designs bucket):**
- Only generated designs are copied here when a project is set to public
- Original room photos are NEVER copied to public storage
- Same path structure as private storage

### Database Columns

The `projects` table stores **storage paths**, never signed URLs:

- `original_image_url`: Path to original room photo (e.g., `user-123/proj-456/original.jpg`)
- `generated_image_urls`: Array of paths to generated designs (e.g., `["user-123/proj-456/design-0.png", ...]`)
- `selected_generation_url`: Path to the user's selected design

**Migration `00010_fix_signed_urls_to_paths.sql`** converts any existing signed URLs to paths.

### Edge Functions

**`get-project-images`** (NEW)
- **Purpose**: Generate short-lived signed URLs for a user's own project images
- **Auth**: Requires valid JWT and verifies project ownership
- **Request**: `POST /get-project-images` with `{ "projectId": "..." }`
- **Response**: 
  ```json
  {
    "success": true,
    "projectId": "proj-456",
    "images": {
      "original_image_url": "https://...?token=...&expires=3600",
      "generated_image_urls": ["https://...?token=...&expires=3600", ...],
      "selected_generation_url": "https://...?token=...&expires=3600"
    },
    "expiresIn": 3600
  }
  ```
- **Expiry**: Signed URLs are valid for exactly **1 hour** (3600 seconds)
- **Ownership**: Non-owners receive `403 Forbidden`

**`generate-design`**
- Now stores paths in the database, not signed URLs
- Paths follow format: `<userId>/<projectId>/design-<n>.png`
- Works with Replicate, OpenRouter, or mock mode

**`set-project-visibility`**
- Copies only generated designs to `public-designs`, never originals
- Skips any path containing "original"
- Normalizes signed URLs to paths before storage operations
- Returns 500 on download/upload failures (fails loudly)

### App Integration

**For private projects:**
1. Call `get-project-images` to get short-lived signed URLs
2. Display images in the app
3. Refresh URLs after 1 hour if needed

**For public projects (Explore feed):**
1. Read directly from `public-designs` bucket (public URLs)
2. No authentication needed
3. Original room photos never exposed

### Privacy Guarantees

✅ Signed URLs expire in 1 hour (not 1 year)  
✅ Database never stores tokens or full URLs  
✅ Original room photos never copied to public storage  
✅ Ownership verified before generating signed URLs  
✅ set-project-visibility filters out paths containing "original"  

---

## 📝 Notes

- All code changes follow existing patterns in the codebase
- TypeScript types are clean
- RLS policies are correct (tested with SQL)
- Security fixes are production-ready
- Legal routes are ready (DRAFT disclaimer included)
- Camera route exists and looks complete
- uploadAndAnalyze() function is well-structured
- **Tests are now running in CI and all passing**
- **Image privacy bug fixed with comprehensive tests**

The main gap is **wiring** - connecting existing pieces together and adding mock mode for local testing.

---

## 🔐 AI Consent Enforcement (Updated October 8, 2026)

### Server-Side Enforcement

All AI operations (`analyze-room`, `generate-design`, `assistant-chat`) enforce consent on the server before processing.

**Version Constant:**
- Shared constant: `supabase/functions/_shared/consent.ts` → `CURRENT_AI_CONSENT_VERSION`
- Client mirrors: `lib/config.ts` → `AI_CONSENT_VERSION` (must match server)

**403 Response Contract:**
```json
{
  "error": "consent_required",
  "reason": "never" | "outdated",
  "current_version": "2026-10-07b"
}
```

- `reason: "never"` = no consent row in database
- `reason: "outdated"` = consent row exists for older version
- Check runs BEFORE any storage read or AI/OpenRouter call

**RLS Policy:**
- Users can only insert/read their own consent rows
- Tested in `scripts/sql-tests/test-consent-security.sql`

### Client-Side Handling

**Data Layer:**
- `lib/data/supabase.ts` parses 403 consent errors and throws `ConsentError` with `isConsentError`, `reason`, `currentVersion`
- `lib/data/in-memory.ts` simulates consent checks using `@visionbuild:mock_consent_version` in localStorage

**Store Behavior (Zustand):**
- `pendingConsent` state holds `{ reason: "never"|"outdated", resume: { type, projectId, imageUri, stylePrompt, roomAnalysis } }`
- Client-side check (camera.tsx): Sets `pendingConsent` with `reason: "never"` for first-time users before photo upload
- `uploadAndAnalyze` and `generateDesigns` catch `ConsentError` from server and set `pendingConsent` with `reason: "outdated"`
- Navigate to `/ai-consent` (no URL params needed - data is in store)

**Consent Screen (`app/ai-consent.tsx`):**
- Reads `pendingConsent` from store (not URL params)
- `reason=outdated`: Shows update notice "We've updated how your photos are handled. Please review before your next design."
- `reason=never`: Normal consent screen, no update notice
- On accept: Writes consent to DB, then directly calls uploadAndAnalyze/generateDesigns with saved context, clears pending consent
- On decline: Clears pending consent, returns to project/camera with photo preserved, no AI call made

**Mock Mode:**
- Set `@visionbuild:mock_consent_version` to simulate consent states:
  - Missing = never
  - Old version (e.g., "2026-10-01") = outdated
  - Current version = allowed

### Tests

**Function Tests (Deno):**
- `supabase/functions/analyze-room/index_test.ts`
- `supabase/functions/generate-design/index_test.ts`
- `supabase/functions/assistant-chat/index_test.ts`
- All test: no consent → 403 never, outdated → 403 outdated, current → success

**SQL Tests:**
- `scripts/sql-tests/test-consent-security.sql`
- Tests: user inserts own consent ✅, cannot insert for other user ✅, can read own ✅, cannot read others ✅

**E2E Tests (Playwright):**
- `e2e/consent-flow.spec.ts`
- Tests:
  1. Outdated consent → re-consent screen with update notice → accept → resumes with same photo/style
  2. Never consent → normal consent screen (no update notice)
  3. Decline → back to camera with photo, no AI request made
  4. Generate-design triggers re-consent when consent becomes outdated mid-flow

**Screenshots:**
- `e2e/screens/a7-reconsent-outdated.png` - Re-consent screen with update notice
- `e2e/screens/a7-reconsent-never.png` - Normal consent screen (first-time)
- `e2e/screens/a7-reconsent-declined-project.png` - Camera screen after decline, photo preserved

### Commits (Agent A7 - Server Enforcement)
1. `33892ab` - feat: enforce AI consent on server
2. `5d31cb5` - feat: handle consent_required errors in app

### Commits (Agent A8 - Store-Based Flow)
1. `68b030d` - fix: use Zustand store for consent state instead of URL params
2. `a464bfa` - fix: make PrivateImage retry test robust with explicit waits
3. `1470b0f` - fix: remove fixed sleep from consent flow test
4. `2a2f007` - fix: properly resume AI operations after consent acceptance

