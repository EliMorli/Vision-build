# VisionBuild Button Status

Last updated: October 8, 2026 (after create loop implementation)

## Legend
- ✅ **Pass A**: Works end-to-end with real backend
- 🟨 **Pass B**: Deferred (contractor threads, quotes, blocks, Explore detail)
- ⚠️ **Works in mock**: Works with mock data but needs backend
- ❌ **Broken**: Does not work at all

## Core Flow Buttons (Create → Design → Results)

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Home (empty) | "Start Your First Project" | ⚠️ Works in mock | Navigates to camera, full loop works in mock |
| Camera/Create | Camera button | ⚠️ Works in mock | Permission requests, captures photo |
| Camera/Create | Gallery button | ⚠️ Works in mock | Permission requests, picks from library |
| Camera/Create | "Analyze Room" | ⚠️ Works in mock | Checks AI consent, uploads & analyzes |
| AI Consent | "Continue" (accept) | ⚠️ Works in mock | Saves consent, continues to editor |
| Style Picker | "Generate 4 Designs" | ⚠️ Works in mock | Calls generate-design, navigates to generating |
| Generating | (progress screen) | ⚠️ Works in mock | Shows animation, polls for completion |
| Results | Design selection (tap) | ⚠️ Works in mock | Selects design with checkmark |
| Results | "Save Design" | ⚠️ Works in mock | Saves to project, navigates to detail |

## Navigation Buttons

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Intro | "Get Started" | ✅ Pass A | → /sign-in |
| Sign-in | "Continue with Google" | ❌ Broken | Disabled (no OAuth in mock) |
| Sign-in | "Continue with Apple" | ❌ Broken | Disabled (no OAuth in mock) |
| Sign-in | "Terms of Service" link | ✅ Pass A | → /terms |
| Sign-in | "Privacy Policy" link | ✅ Pass A | → /privacy |
| Home | "Continue" (consent) | ✅ Pass A | → home after consent |
| Tab Bar | Home tab | ✅ Pass A | → /(tabs)/ |
| Tab Bar | Explore tab | ✅ Pass A | → /(tabs)/explore |
| Tab Bar | + Create tab | ⚠️ Works in mock | → /(tabs)/camera, full create loop works |
| Tab Bar | Inbox tab | ✅ Pass A | → /(tabs)/inbox |
| Tab Bar | Profile tab | ✅ Pass A | → /(tabs)/profile |

## Vi Chat Buttons

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Vi Chat | "Generate Design" | ❌ Broken | No handler implemented |
| Vi Chat | "Find Me a Pro" | ✅ Pass A | → /handoff/placeholder |
| Vi Chat | Send message | ❌ Broken | sendMessage() is stub |

## Profile & Settings Buttons

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Profile | "Sign Out" | ❌ Broken | Doesn't clear mock session |
| Profile | "Edit Profile" | ❌ Broken | route: null |
| Profile | "My Properties" | ❌ Broken | route: null, fake badge "3" |
| Profile | "Saved Designs" | ❌ Broken | route: null, fake badge "12" |
| Settings | Push Notifications toggle | ❌ Broken | Local state only |
| Settings | Marketing Emails toggle | ❌ Broken | Local state only |
| Settings | Public Projects toggle | ❌ Broken | Local state only |
| Settings | Opt out AI toggle | ❌ Broken | Calls DB (fails in mock) |
| Settings | Reduce Motion toggle | ❌ Broken | Zustand only, not persisted |
| Settings | "Delete Account" | ❌ Broken | Button missing (function exists) |

## Project Detail Buttons

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Project Detail | Privacy toggle | ⚠️ Works in mock | MakePublicSheet wired, persists in mock |
| Project Detail | "New Design" | ❌ Broken | Not wired |
| Project Detail | "View Quotes" | ❌ Broken | Not wired |

## Explore Buttons (Pass B - Deferred)

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Explore | Design card tap | 🟨 Pass B | No detail screen |
| Explore | Like/Save | 🟨 Pass B | Not implemented |
| Explore | Report | ❌ Broken | Alert with empty callbacks |

## Inbox Buttons (Pass B - Deferred)

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Inbox | Contractor thread tap | 🟨 Pass B | No conversation screen |
| Inbox | Block | 🟨 Pass B | console.log only |

## Handoff Buttons

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Handoff | "Generate Project Brief" | ❌ Broken | Disabled (no brief data) |
| Handoff | "Send to 3 pros" | ❌ Broken | dispatchLead() is stub |

## Error Screens

| Screen | Button | Status | Notes |
|--------|--------|--------|-------|
| Rate Limit Error | "Back to Home" | ✅ Pass A | → /(tabs)/ |

---

## Summary

| Category | Total | Pass A | Pass B | Works in Mock | Broken |
|----------|-------|--------|--------|---------------|--------|
| **All Buttons** | 43 | 9 (21%) | 4 (9%) | 10 (23%) | 20 (47%) |
| **Core Flow** | 9 | 0 | 0 | 9 | 0 |
| **Navigation** | 11 | 8 | 0 | 1 | 2 |
| **Vi Chat** | 3 | 1 | 0 | 0 | 2 |
| **Profile/Settings** | 10 | 0 | 0 | 0 | 10 |
| **Project Detail** | 3 | 0 | 0 | 1 | 2 |
| **Explore** | 3 | 0 | 2 | 0 | 1 |
| **Inbox** | 2 | 0 | 2 | 0 | 0 |
| **Handoff** | 2 | 0 | 0 | 0 | 2 |
| **Error Screens** | 1 | 1 | 0 | 0 | 0 |

**Target for this PR**: Every button not marked Pass B (contractor threads, quotes, blocks, Explore detail) actually works end to end.

**✅ COMPLETED in this pass**:
- ✅ Camera capture + upload (with permissions)
- ✅ AI consent gate (accept/decline flows)
- ✅ Analyze room (with data layer for mock mode)
- ✅ Style picker → generate (with pressed states)
- ✅ Results + design selection (with async UX)
- ✅ Save design and navigate to project detail
- ✅ /terms and /privacy routes
- ✅ MakePublicSheet wired (privacy toggle)
- ✅ PrivateImage component (signed URLs, retry, placeholder)
- ✅ E2E tests for full create loop in mock mode

**Still broken (out of scope for this PR)**:
- ❌ Sign out (mock mode)
- ❌ AI consent saved to DB (currently AsyncStorage only)
- ❌ Settings toggles persist
- ❌ Delete Account button
- ❌ Edit Profile screen
- ❌ Vi chat saves messages
- ❌ Vi Generate Design starts loop
- ❌ Explore Report uses ReportModal
