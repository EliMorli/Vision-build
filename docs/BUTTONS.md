# VisionBuild Button Audit

Comprehensive audit of all interactive controls across VisionBuild screens, documenting their purpose, implementation, and test coverage.

## Home Screen (`app/(tabs)/index.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| XP Chip (Pressable) | - | Navigate to profile settings | `router.push("/profile-settings")` | Manual (no explicit e2e) |
| Dev Button (Pressable) | - | Navigate to profile settings (dev mode only) | `router.push("/profile-settings")` | Gated by `SHOW_DEV_BUTTON`, checked by `check:dev-button` |
| "Start your first project" (Button) | - | Navigate to camera | `router.push("/(tabs)/camera")` | Used in e2e tests |
| "Start a new room" (Button) | - | Navigate to camera | `router.push("/(tabs)/camera")` | Used in e2e tests |
| Project Card (Pressable) | `home-project-card` | Open project detail | `router.push(/project/${project.id})` | Implicit in e2e |
| Pull-to-refresh | - | Refresh project list | `fetchProjects()` | Manual |

## Explore Screen (`app/(tabs)/explore.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Search Input | - | Filter designs | Updates `searchQuery` state | Manual |
| "Start a new room" (Button) | - | Navigate to camera | `router.push("/(tabs)/camera")` | Used in e2e |
| Design Card (Pressable) | `explore-design-card` | View design details | Currently no action (viewing only) | Manual |
| More Button (Pressable) | `explore-report-button` | Report/block user | Opens `MenuSheet` with report and block options | E2E test (`explore-report-block.spec.ts`) |
| Menu: Report option | `menu-report-option` | Report design | Opens `ConfirmationSheet` for report confirmation | E2E test |
| Menu: Block option | `menu-block-option` | Block user | Opens `ConfirmationSheet` for block confirmation | E2E test |

**Confirmation Flow:**
- `MenuSheet` (`report-block-menu`) replaces native Alert.alert, works on iOS/Android/Web
- `ConfirmationSheet` (`report-confirm-sheet`, `block-confirm-sheet`) confirms destructive actions
- Success message (`success-message`) shows result inline with Nunito font and theme colors

## Inbox Screen (`app/(tabs)/inbox.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| (Empty state only) | - | - | - | Shows EmptyState component |

**Note**: No unread badge currently implemented. Required by task #4.

## Profile Screen (`app/(tabs)/profile.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Edit Profile (Pressable) | - | Navigate to edit profile | `router.push("/edit-profile")` | Manual |
| Settings & Privacy (Pressable) | `profile-settings-button` | Navigate to settings | `router.push("/profile-settings")` | Used in e2e |
| My Properties (Pressable) | - | View properties | Currently `route: null` - no action | **NEEDS FIX: Wire or remove** |
| Saved Designs (Pressable) | - | View saved designs | Currently `route: null` - no action | **NEEDS FIX: Wire or remove** |
| Help & Contact (Pressable) | - | Navigate to help | `router.push("/help-contact")` | Manual |
| Sign Out (Button) | - | Sign out | `signOut()` | Manual |

## Camera Screen (`app/(tabs)/camera.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Camera Button (Pressable) | - | Launch camera | `pickImage(true)` | Used in e2e |
| Gallery Button (Pressable) | - | Pick from gallery | `pickImage(false)` | Used in e2e |
| Image Preview (Pressable) | - | Change photo | `pickImage(false)` | Manual |
| "Analyze Room" (Button) | - | Upload and analyze | `handleAnalyze()` | Used in e2e |

## Editor/Style Picker Screen (`app/editor/[id].tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Style Card (Pressable) | - | Select style | `setSelectedStyle(item)` | Used in e2e |
| "Generate 4 designs" (Button) | - | Generate designs | `handleGenerate()` → navigates to generating screen | Used in e2e |

## Generating Screen (`app/generating/[id].tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| "Peek at N ready" (Button) | - | View partial results | `router.push(/result/${id})` | Manual |
| "Go to Home" (Button) | - | Return to home | `router.push("/(tabs)/")` | Manual (long-running state) |

## Results Screen (`app/result/[id].tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Design Card (Pressable) | - | Select design | `handleSelect(url)` | Manual |
| Design Card (onLongPress) | - | Show before/after compare | Opens modal with comparison | Manual |
| XP Banner Dismiss (Pressable) | - | Dismiss banner | `setShowXPBanner(false)` | Manual |
| "Join the waitlist" (Button) | `results-waitlist-join` | Join pros waitlist | `handleJoinWaitlist()` | Used in e2e (pros-waitlist.spec.ts) |
| "Save to my project" (Button) | `results-save` | Save selected design | `handleContinue()` → navigates to project detail | Used in e2e |
| Compare Modal (Pressable) | - | Close modal | `setShowCompare(false)` | Manual |

## Project Detail Screen (`app/project/[id].tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| More Options (Pressable) | - | Show options menu | Currently no action | **NEEDS FIX: Wire or remove** |
| Privacy Toggle (Pressable) | - | Toggle project privacy | `handleTogglePrivacy()` | Manual |
| Design Card (Pressable) | - | View design in results | `router.push(/result/${id})` | Manual |
| "Create designs" (Pressable) | - | Navigate to editor | `router.push(/editor/${id})` | Manual (empty state) |
| "View chat" (Pressable) | - | Open assistant chat | `router.push("/assistant-chat")` | Manual |
| Chat Preview (Pressable) | - | Open assistant chat | `router.push("/assistant-chat")` | Manual |
| "Join the pros waitlist" (Pressable) | `project-brief-waitlist` | Navigate to pros waitlist | `router.push(/pros-coming-soon?projectId=${id})` | Used in e2e |
| Tab Switcher (Pressable) | - | Switch between Designs/Timeline | `setActiveTab()` | Manual |

## Assistant Chat Screen (`app/assistant-chat.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| Send Message Input | - | Type message | Updates `inputText` | Manual |
| Send Button (Pressable) | - | Send message | `sendMessage()` | Manual |
| Generate Design Button | - | Generate from chat | `generateDesign()` | Manual |
| Report Button (Pressable) | - | Report message | Opens ReportModal | **NEEDS FIX: Wire to real action** |

## Profile Settings Screen (`app/profile-settings.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| Pros Waitlist (Switch) | `settings-pros-waitlist-toggle` | Toggle waitlist | `handleProsWaitlist()` | Used in e2e |
| Public Projects Default (Pressable) | - | Toggle default privacy | `updateSetting("publicProjectsDefault", ...)` | Manual |
| Opt out AI (Pressable) | - | Toggle AI opt-out | `handlePrivacyOptOut()` | Manual |
| Request Data (Pressable) | - | Email support | Opens mailto link | Manual |
| Reduce Motion (Pressable) | - | Toggle motion | `updateSetting("reduceMotion", ...)` | Manual |
| Terms of Service (Pressable) | - | Open terms | `openLink("https://visionbuild.app/terms")` | Manual |
| Privacy Policy (Pressable) | - | Open privacy | `openLink("https://visionbuild.app/privacy")` | Manual |
| Sign Out (Pressable) | - | Sign out | `signOut()` | Manual |
| Delete Account (Pressable) | - | Delete account | Shows confirmation, then `handleDeleteAccount()` | Manual |

## Edit Profile Screen (`app/edit-profile.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| Avatar (Pressable) | - | Pick new photo | `pickImage()` | Manual |
| Display Name Input | - | Edit name | Updates `displayName` | Manual |
| "Save Changes" (Button) | - | Save profile | `handleSave()` | Manual |

## Help & Contact Screen (`app/help-contact.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| Email Support (Pressable) | - | Send email | Opens mailto link | Manual |
| Terms of Service (Pressable) | - | Open terms | `openLink()` | Manual |
| Privacy Policy (Pressable) | - | Open privacy | `openLink()` | Manual |
| Open-source licenses (Pressable) | - | Open licenses | `openLink()` | Manual |

## Pros Coming Soon Screen (`app/pros-coming-soon.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Back Button (Pressable) | - | Go back | `router.back()` | Manual |
| "Join the waitlist" (Button) | `pros-coming-soon-join` | Join pros waitlist | `handleNotifyMe()` | Used in e2e (pros-waitlist.spec.ts) |

## AI Consent Screen (`app/ai-consent.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| "Continue" (Button) | - | Accept AI consent | `handleAccept()` → resumes pending operation | Used in e2e (consent-flow.spec.ts) |
| "Not now" (Button) | - | Decline AI consent | `handleDecline()` → returns to previous screen | Used in e2e (consent-flow.spec.ts) |
| Privacy Policy (Pressable) | - | View privacy policy | `router.push("/privacy")` | Used in e2e |

## Tab Navigation (`app/(tabs)/_layout.tsx`)

| Control | testID | Purpose | Action | Test Coverage |
|---------|--------|---------|--------|---------------|
| Home Tab | - | Navigate to home | Built-in navigation | Used in e2e |
| Explore Tab | - | Navigate to explore | Built-in navigation | Manual |
| Create Tab (+) | - | Navigate to create choice | `router.push("/create-choice")` | Manual |
| Inbox Tab | - | Navigate to inbox | Built-in navigation | Manual |
| Profile Tab | - | Navigate to profile | Built-in navigation | Manual |

## Summary of Issues Found

### Buttons Removed and Why

1. **Explore screen search input (editable=false)** - FIXED: Enabled the input, was artificially disabled
2. **Explore screen more button (Alert placeholder)** - RESTORED & FIXED: Now wired to ReportModal with report/block functionality per App Store 1.2 guidelines
3. **Profile "My Properties"** - REMOVED: No properties feature exists at launch (route: null)
4. **Profile "Saved Designs"** - REMOVED: No saved designs feature exists at launch (route: null, placeholder for future)
5. **Project detail "More options"** - REMOVED: No actual options menu existed, just an empty Pressable
6. **Assistant chat report button** - Already properly wired to ReportModal (no change needed)
7. **Various Alert placeholders in handoff flows** - Already gated behind CONTRACTOR_OUTREACH_ENABLED (allowlisted)

### Missing Features

8. **Inbox unread badge** - Required by task #4. Need to implement badge driven by real message data.

### States Missing

9. **Loading states** - Need spinners/skeletons for Home, Explore, Project, Profile, Results, Editor when fetching data.
10. **Empty states** - Need proper empty states for Explore (no public designs), Inbox (done), Profile (no projects).
11. **Error states** - Need error states with retry for all data screens.
12. **Offline states** - Need offline banner or handling for all network operations.

## Contractor Features (Hidden Behind Flag)

The following screens/features are properly gated behind `CONTRACTOR_OUTREACH_ENABLED=false` and excluded from homeowner launch:
- `app/handoff/[id].tsx`
- `app/handoff-location.tsx`
- `app/handoff-confirm.tsx`

These are correctly excluded from the launch copy check and do not appear in homeowner UI.

---

## Confirmation Components (Web-Compatible)

To fix Alert.alert incompatibility on React Native Web, we use custom components that work on iOS, Android, and Web:

### MenuSheet (`components/MenuSheet.tsx`)
- Bottom sheet menu for multiple options (replaces Alert.alert with buttons)
- Used for: Explore report/block menu
- Props: `title`, `options[]` with `label`, `icon`, `variant`, `onPress`, `testID`
- Styled with Nunito fonts and theme colors
- testID: Base testID is customizable (e.g., `report-block-menu`)

### ConfirmationSheet (`components/ConfirmationSheet.tsx`)
- Modal confirmation for destructive actions (replaces Alert.alert with OK/Cancel)
- Used for: Report design confirmation, Block user confirmation
- Props: `title`, `message`, `confirmLabel`, `confirmVariant` (`primary`|`danger`), `onConfirm`, `testID`
- Styled with Nunito fonts and theme colors
- testIDs: `{testID}` (container), `{testID}-cancel` (Cancel button), `{testID}-confirm` (Confirm button)

**Usage Pattern:**
```typescript
// 1. Show MenuSheet for options
<MenuSheet visible={menuVisible} title="Report or Block" options={[...]} />

// 2. Show ConfirmationSheet for confirmation
<ConfirmationSheet visible={confirmVisible} title="Block User" message="..." onConfirm={...} />

// 3. Show success message inline
{successMessage && <View testID="success-message"><Text>{successMessage}</Text></View>}
```

**E2E Testing:**
- `menu-report-option`, `menu-block-option` - Menu options
- `report-confirm-sheet`, `block-confirm-sheet` - Confirmation dialogs
- `report-confirm-sheet-confirm`, `block-confirm-sheet-confirm` - Confirm buttons
- `success-message` - Success feedback

These components replace all Alert.alert calls that gate destructive/confirm actions requiring web compatibility.
