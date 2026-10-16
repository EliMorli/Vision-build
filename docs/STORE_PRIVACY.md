# App Store Privacy Declarations

This document provides answers for Apple App Privacy and Google Data Safety questionnaires based on what VisionBuild actually collects and how it's used.

---

## Apple App Privacy

### Data Used to Track You
**Does this app collect data to track you across apps and websites owned by other companies?**

❌ **NO** - We do not track users across apps or websites. We do not use any third-party analytics, advertising, or tracking SDKs.

### Data Linked to You

The following data is collected and linked to the user's identity:

#### Contact Info
- **Email Address**
  - Used for: App Functionality, Account Management
  - Why: Required for account creation, sign-in, and account-related communications

#### User Content
- **Photos or Videos**
  - Used for: App Functionality
  - Why: Users upload room photos to generate design visualizations
- **Other User Content** (chat messages with AI assistant)
  - Used for: App Functionality
  - Why: To provide design assistance through our AI chat feature

#### Identifiers
- **User ID**
  - Used for: App Functionality
  - Why: To associate user data (projects, settings) with their account

#### Usage Data
- **Product Interaction** (limited: XP system only)
  - Used for: App Functionality
  - Why: To track user achievements and level progression within the app
  - Note: No analytics, crash logs, or behavioral tracking

### Data NOT Linked to You

We do NOT collect any data that is not linked to user identity.

### Data NOT Collected

We do NOT collect:
- ❌ Precise Location
- ❌ Name (only email and optional display name)
- ❌ Phone Number
- ❌ Physical Address (only ZIP code for contractor matching, stored with projects not profiles)
- ❌ Financial Info / Payment Info
- ❌ Health & Fitness
- ❌ Contacts
- ❌ Search History
- ❌ Browsing History
- ❌ Sensitive Info
- ❌ Diagnostics
- ❌ Other Data Types not listed above

---

## Google Data Safety

### Location
**Does your app collect any location data?**

❌ **NO** - We do not collect precise location, approximate location, or any location data through the app. ZIP codes are manually entered by users for contractor matching and are stored with project data, not as location tracking.

### Personal Info
**Does your app collect personal info?**

✅ **YES**

- **Name** (optional display name)
  - Used for: App functionality
  - Required: No
  - User can choose whether to share: Yes

- **Email address**
  - Used for: Account management
  - Required: Yes (for account creation)
  - User can choose whether to share: No (required for account)

### Financial Info
**Does your app collect financial info?**

❌ **NO** - We do not process payments or collect financial information.

### Health & Fitness
**Does your app collect health and fitness data?**

❌ **NO**

### Messages
**Does your app collect messages?**

✅ **YES** (User-to-AI chat only, not user-to-user)

- **Other in-app messages** (AI assistant chat)
  - Used for: App functionality
  - Required: No
  - User can choose whether to share: Yes

### Photos and Videos
**Does your app collect photos and videos?**

✅ **YES**

- **Photos** (room photos uploaded by user)
  - Used for: App functionality (design generation)
  - Required: No (user can use app without uploading photos)
  - User can choose whether to share: Yes

- **Videos**
  - We do NOT collect videos

### Audio Files
**Does your app collect audio?**

❌ **NO**

### Files and Docs
**Does your app collect files and docs?**

❌ **NO** (photos are handled separately in Photos section)

### Calendar
**Does your app collect calendar data?**

❌ **NO**

### Contacts
**Does your app collect contacts?**

❌ **NO**

### App Activity
**Does your app collect data about app activity?**

✅ **YES** (Very limited - XP system only)

- **App interactions** (XP events: completing actions like generating designs)
  - Used for: App functionality (gamification/achievements)
  - Required: No
  - User can choose whether to share: No (automatic for all users)

We do NOT collect:
- ❌ In-app search history
- ❌ Installed apps
- ❌ Other user-generated content
- ❌ Other actions (beyond XP-tracked events)

### Web Browsing
**Does your app collect web browsing data?**

❌ **NO**

### App Info and Performance
**Does your app collect app info and performance data?**

❌ **NO** - We do not collect crash logs, diagnostics, or performance data.

### Device or Other IDs
**Does your app collect device or other identifiers?**

✅ **YES**

- **User IDs** (Supabase Auth UUID)
  - Used for: App functionality, Account management
  - Required: Yes
  - User can choose whether to share: No (required for account)

We do NOT collect:
- ❌ Device or other IDs (advertising ID, IMEI, etc.)

---

## Data Security

### Encryption in Transit
✅ **YES** - All data is encrypted in transit using HTTPS/TLS.

### Encryption at Rest
✅ **YES** - All data is encrypted at rest in Supabase (PostgreSQL with encryption).

### User Can Request Data Deletion
✅ **YES** - Users can request account deletion from Settings > Delete Account. All user data is permanently deleted within 30 days.

---

## Data Sharing

### Do you share data with third parties?

✅ **YES** - We share data with third parties for app functionality only:

#### OpenRouter (AI Processing)
- **Data shared**: Room photos, chat messages
- **Purpose**: To generate design visualizations and provide AI assistance
- **User control**: Users can opt out of AI processing in Settings (disables design generation and chat)
- **Privacy**: OpenRouter is configured to use providers that do not train on user data

#### Resend (Email Service)
- **Data shared**: Email address
- **Purpose**: To send account-related emails (deletion confirmations, support responses)
- **User control**: Cannot opt out of account-related emails; can opt out of marketing emails

We do NOT share data with:
- ❌ Advertisers
- ❌ Analytics providers
- ❌ Data brokers
- ❌ Other third parties not listed above

---

## Summary

**What we collect:**
- Email address (required for account)
- Optional display name
- Room photos (only when user uploads them)
- AI chat messages (only when user uses Vi assistant)
- XP events for gamification

**What we DON'T collect:**
- No location tracking
- No advertising ID
- No analytics or crash data
- No contacts, calendar, or sensitive data
- No payment information
- No tracking across apps/websites

**How it's used:**
- 100% for app functionality (account management, design generation, AI assistance)
- Zero advertising, zero tracking, zero analytics

**User control:**
- Can delete account anytime (Settings > Delete Account)
- Can opt out of AI processing (disables design generation and chat)
- Can opt out of marketing emails
- Projects can be kept private (not shared in Explore)

---

Last Updated: October 8, 2026
