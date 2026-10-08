> **DRAFT — not legal advice; review with an attorney before publishing.**

# VisionBuild Privacy Policy

**Effective date:** [EFFECTIVE DATE]
**Last updated:** [EFFECTIVE DATE]

This Privacy Policy explains what information VisionBuild collects, how we use it, who we share it with, and the choices and rights you have. It applies to the VisionBuild mobile app (iOS and Android), the web version of the app, and related services (together, the "Service").

VisionBuild is operated by [COMPANY LEGAL NAME], a [ENTITY TYPE] based in California ("VisionBuild," "we," "us," or "our"). You can reach us at [SUPPORT EMAIL] or [MAILING ADDRESS].

> [NOTE: Until a legal entity is formed, the operator would be Elimar Morli as an individual. Decide which name goes here before publishing.]

## The short version

- You sign in with Google or Apple. We don't see or store your Google or Apple password.
- Your photos and chats are sent through OpenRouter only to AI providers that don't keep or train on your data, and only to create your designs.
- Location data (EXIF/GPS) is removed from your photos **on your device**, before upload.
- Projects are **Private** by default. Only designs you choose to make Public appear in Explore.
- Contractors only see the project details you switch on. Your phone number and email stay hidden until you pick a pro.
- We don't sell your personal information, we don't share it for cross-context behavioral advertising, and we don't show ads.
- You can delete your account, and everything in it, from **Settings → Delete account**.

---

## 1. Information we collect

### Information you give us

- **Account information.** When you sign in with Google or Sign in with Apple, we receive basic profile information from that provider, such as your name, email address (which may be an Apple "Hide My Email" relay address), and a unique account identifier. We also record that you confirmed you are 13 or older.
- **Profile information.** Your public handle and any other profile details you add. [NOTE: Confirm how handles are created — user-chosen, auto-generated, or derived from the sign-in name — and whether there is a profile photo.]
- **Photos.** Pictures you take or upload of a room, home exterior, or backyard. Location/EXIF data is stripped on your device before the photo is uploaded, so we do not receive the photo's GPS location.
- **Chats with Vi.** Messages you send to our AI assistant, "Vi," and Vi's replies.
- **Designs and project data.** Styles you choose, AI-generated design visualizations, project names, project briefs, timelines, and other content saved in your project library.
- **"Find me a pro" details.** Your ZIP code, budget range, and the project brief, plus any contact details you choose to give contractors (such as your phone number and email). [NOTE: Confirm where the user's phone number is collected — e.g., entered optionally in the "Find me a pro" flow — and whether it is required.]
- **Messages and quotes.** Messages you exchange with contractors in the in-app Inbox, and replies and quotes contractors send back.
- **Reports and blocks.** Content or users you report or block, and any details you include in a report.
- **Settings and choices.** Your notification settings, default Public/Private setting, Reduce Motion setting, and your privacy choices.
- **Support requests.** Anything you send us when you contact support.

### Information created when you use the Service

- **AI consent records.** When you agree to AI processing, we record your consent along with the consent version and date.
- **Outreach logs.** Each time we send your project brief to a contractor on your behalf, we log the send (for example: which contractor, when, and what information was included).
- **Gamification and usage events.** XP, levels, badges, quests, weekly challenges, and records of actions you take in the app (for example, creating a design, liking or remixing a design). We also track how much you use AI features so we can apply daily usage limits.
- **Public activity.** Likes, saves, and remixes on public designs.
- **Device and push information.** If you allow notifications, a push notification token for your device (handled through Expo, Apple, and Google).
- **Basic technical data.** Information such as IP address, device type, operating system, app version, browser type (web), time zone/language settings, timestamps, and error logs, collected automatically when your device connects to our servers.

> [NOTE: Analytics and crash-reporting tools have not been chosen yet. When one is added (e.g., a crash reporter or product analytics), list it here and in Section 4, describe what it collects, and confirm it is configured not to be used for advertising. Also update the CCPA table in Section 10 and the App Store / Google Play privacy labels.]

### Information we do **not** collect

- We do not collect your precise location. (We receive the ZIP code you type in, which is not precise location.)
- We do not receive your Google or Apple password.
- We do not collect payment information (the Service has no payments at this time).

## 2. How we use your information

We use your information to:

- **Provide the Service** — create your account, sign you in, store your projects, and show your designs.
- **Generate AI designs and run Vi** — send your photos, chats, and chosen style to AI providers to create design visualizations, chat replies, and project briefs.
- **Find contractors for you** — write your project brief, email it to local contractors using the information you switched on, deliver their replies and quotes to your Inbox, and let you chat with them.
- **Run public features** — show designs from Public projects in Explore, along with your handle and level, and allow likes, saves, and remixes.
- **Run gamification** — track XP, levels, badges, quests, and challenges.
- **Send notifications** — if you allow it, notify you when a long render finishes or when you get a message.
- **Keep the Service safe** — apply daily usage limits, review reports, moderate content, block or ban accounts, prevent abuse of contractor outreach and fake leads, and protect against fraud and security incidents.
- **Maintain and improve the Service** — troubleshoot bugs and fix errors. [NOTE: If you plan to use user content (photos, chats, designs) to improve the product beyond fixing bugs, that must be disclosed here and should be consistent with the AI consent screen. As drafted, we do not.]
- **Communicate with you** — respond to support requests and send important notices about the Service, such as changes to these policies.
- **Comply with law** — meet legal obligations, enforce our Terms of Service, and respond to lawful requests.

We do **not** use your photos or chats to train AI models, and we do not use your information for advertising.

## 3. AI processing

VisionBuild uses third-party AI models to create design visualizations, power Vi, and draft project briefs.

- **How it works.** Your photos, chats, and design choices are sent through **OpenRouter**, an AI routing service, to AI model providers — currently **Google** (Gemini models via Google Vertex AI) and **Anthropic** (Claude models).
- **No retention, no training.** Your photos and chats are sent through OpenRouter only to AI providers that don't keep or train on your data, and only to create your designs. We have configured OpenRouter for zero data retention and no data collection.
- **Your consent.** Before your first AI request, we ask for your consent and record it on your account with the version and date.
- **Your designs stay yours.** Your designs stay in your projects until you delete them.
- **AI can be wrong.** AI results are labeled "AI visualization, not a plan or quote." They may be inaccurate and are not architectural, engineering, structural, permitting, or cost advice. See our Terms of Service.

> [NOTE: Confirm the zero-data-retention settings are enforced on the OpenRouter account for every model actually used, and check whether any provider keeps data briefly for abuse/safety monitoring even under ZDR. If so, adjust wording here and on the consent screen. Update the provider list whenever models change.]

## 4. How we share information

We don't sell your personal information and we don't share it for cross-context behavioral advertising. We share information only as described below.

### Service providers

We use these companies to run the Service. They may process your information only on our behalf and under our instructions:

| Provider | What they do for us | Information involved |
|---|---|---|
| **Supabase** | Database, file storage, and authentication | Account info, photos, designs, chats, project data, messages, logs |
| **OpenRouter** | Routes AI requests to model providers (zero data retention, no data collection) | Photos, chats, style choices, brief inputs |
| **Google (Vertex AI / Gemini)** | AI model processing | Photos, chats, style choices, brief inputs |
| **Anthropic (Claude)** | AI model processing | Chats, brief inputs, and possibly photos |
| **Resend** | Sends project-brief emails to contractors | Contractor email addresses, the brief and info you switched on |
| **Expo** | Push notification delivery | Push token, notification content |
| **Apple and Google** | Sign-in, and push notification delivery on their platforms | Sign-in identifiers, push token |
| [NOTE: analytics / crash reporting — TBD] | | |

> [NOTE: Confirm the exact data each provider receives (e.g., whether photos go to Anthropic models or only to Gemini) and fill in hosting regions (e.g., Supabase project region).]

### Contractors — only what you choose

When you use **"Find me a pro,"** we email a project brief to local contractors on your behalf. Before anything is sent, you see a screen where you can switch each piece of information on or off. Contractors receive only what you switched on. **Your phone number and email address stay hidden until you pick a pro.** Contractors then reply through us, and their replies and quotes come back to your in-app Inbox.

Once a contractor receives your brief or your contact details, the contractor has its own copy and handles it under its own practices. We can't delete information from a contractor's own records.

### Other users — only Public projects

Projects are **Private** by default. If you make a project **Public** (you'll be asked to confirm), its designs appear in the Explore feed with your handle and level. Other users can view, like, save, and remix those designs. You can make a project Private again at any time, but other users may have already viewed, saved, or remixed it.

> [NOTE: Confirm that only AI-generated designs — not original room photos, chats, briefs, ZIP code, budget, or quotes — become visible when a project is made Public. Also decide what happens to other users' saves and remixes when a design is made Private or deleted, and state it here.]

### Legal and safety reasons

We may disclose information if we believe in good faith it is required by law or legal process, or needed to protect the rights, safety, or property of our users, the public, or VisionBuild, including to investigate fraud, abuse, or violations of our Terms.

### Business changes

If VisionBuild is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that transaction, subject to this Policy.

### With your direction

We may share information in other ways when you ask us to or give us permission.

## 5. Your choices in the app

- **Public / Private.** Choose per project, and set your default in Settings.
- **What contractors see.** Toggle each item on the pre-send screen.
- **Notifications.** Turn push notifications on or off in your device settings and in Settings → Notifications.
- **Your Privacy Choices.** Use Settings → Your Privacy Choices to submit privacy requests and opt-out choices.
- **Report and Block.** Report or block Explore content, AI results, Vi replies, and contractor chats.
- **Delete account.** Settings → Delete account (see Section 7).

**Do Not Track / Global Privacy Control.** We don't sell or share personal information or track you across other apps or websites for advertising, so there is nothing to opt out of. We will honor Global Privacy Control (GPC) signals sent from browsers using the web version as a valid opt-out request.

## 6. Data retention

We keep information only as long as needed for the purposes described in this Policy:

| Information | How long we keep it |
|---|---|
| Account information | Until you delete your account |
| Photos, designs, chats, briefs, timelines, project data | Until you delete them or delete your account ("Your designs stay in your projects until you delete them.") |
| Messages and quotes with contractors | Until you delete the project or your account [NOTE: confirm] |
| XP, levels, badges, usage events | Until you delete your account |
| AI consent records | For the life of your account, and up to [NOTE: retention period] afterward as proof of consent |
| Outreach send logs | [NOTE: retention period, e.g., X months/years — needed for anti-spam compliance and abuse prevention] |
| Reports, blocks, and moderation records | [NOTE: retention period; may need to be kept after deletion to enforce bans] |
| Server and technical logs | [NOTE: retention period, e.g., 30–90 days] |
| Backups | Deleted data may remain in encrypted backups for up to [NOTE: backup retention period, per Supabase plan] before being overwritten |
| Push token | Until you turn off notifications, sign out, or delete your account |

We may keep information longer if required by law or to resolve disputes, prevent fraud or abuse, or enforce our agreements.

## 7. Deleting your account

You can delete your account at any time from **Settings → Delete account**. This permanently deletes your account, projects, designs, and related data, and revokes your Sign in with Apple token (if you used Apple to sign in). Deletion can't be undone.

If you can't access the app, email [SUPPORT EMAIL] from the email address associated with your account to request deletion. [NOTE: Google Play requires a web link where users can request account deletion without reinstalling the app — e.g., https://[WEBSITE DOMAIN]/delete-account. Create it and list it here.]

Some information may remain after deletion, as described in Section 6 (for example, limited records we must keep, backups until they are overwritten, copies already received by contractors, and designs other users already saved or remixed from your Public projects).

## 8. Security

We use reasonable technical and organizational measures to protect your information, including encryption in transit, access controls on our database and storage, stripping location data from photos on your device, and limiting what AI providers and contractors receive. No system is 100% secure, and we can't guarantee absolute security. If we learn of a security breach affecting your personal information, we will notify you as required by law.

> [NOTE: Confirm encryption at rest (Supabase default), row-level security on all tables/buckets, and who on the team has admin access.]

## 9. Children

VisionBuild is not for children under 13. You must confirm you are 13 or older to use the Service. We do not knowingly collect personal information from children under 13. If we learn that we have, we will delete it. If you believe a child under 13 is using VisionBuild, contact us at [SUPPORT EMAIL].

If you are between 13 and 17, you need permission from a parent or guardian to use VisionBuild. We do not sell or share personal information of anyone, including users under 16.

## 10. Your California privacy rights (CCPA / CPRA)

If you are a California resident, the California Consumer Privacy Act, as amended by the California Privacy Rights Act ("CCPA"), gives you the rights below.

> [NOTE: The CCPA legally applies only to businesses that meet certain thresholds (e.g., annual revenue above the inflation-adjusted threshold, or buying/selling/sharing personal information of 100,000+ California consumers or households). VisionBuild may not meet them yet. This section is drafted to comply anyway, which is good practice and expected by users. Have the attorney confirm.]

### Your rights

- **Right to know / access.** You can ask what personal information we have collected about you, the categories of sources, why we collected it, the categories of third parties we disclose it to, and a copy of the specific pieces of personal information we have about you.
- **Right to delete.** You can ask us to delete personal information we collected from you, subject to legal exceptions.
- **Right to correct.** You can ask us to correct inaccurate personal information.
- **Right to opt out of sale or sharing.** We do **not** sell your personal information and do **not** share it for cross-context behavioral advertising, and we have not done so in the past 12 months. You can still record an opt-out choice in Settings → Your Privacy Choices, and we will honor it if our practices ever change.
- **Right to limit use of sensitive personal information.** Some information we handle may count as "sensitive personal information" under the CCPA — specifically, the contents of messages you exchange with contractors through the Inbox. We use it only to provide the Service you request and for other purposes the CCPA permits (such as security and preventing fraud). We do not use or disclose sensitive personal information to infer characteristics about you, so the right to limit does not apply. [NOTE: Attorney to confirm the analysis.]
- **Right to non-discrimination.** We won't deny you service, charge you a different price, or give you a different level of service because you exercised your privacy rights.

### How to exercise your rights

- **In the app:** Settings → **Your Privacy Choices**, or Settings → **Delete account**.
- **By email:** [SUPPORT EMAIL] (subject line: "Privacy Request").
- [NOTE: Optional — add a web form at https://[WEBSITE DOMAIN]/privacy-request. A toll-free number is not required for businesses that operate exclusively online and have a direct relationship with consumers.]

### Verification

To protect your account, we verify requests before acting on them. Requests made from within the app while you are signed in are verified by your sign-in. For email requests, we will ask you to confirm control of the email address linked to your account, and we may ask for additional information that matches what we have. We will use information you provide for verification only to verify your request.

### Authorized agents

You can use an authorized agent to make a request for you. We will require the agent to provide signed written permission from you (or a valid power of attorney), and we may ask you to verify your identity directly and confirm you gave the agent permission.

### Response timing

We will confirm receipt of your request within 10 business days and respond within **45 calendar days**. If we need more time (up to another 45 days), we will tell you why. Requests are free; we may decline or charge a reasonable fee only for requests that are clearly unfounded or excessive, as the law allows.

### Categories of personal information (last 12 months)

| CCPA category | Examples of what we collect | Sources | Business purposes | Categories of recipients | Sold or shared? |
|---|---|---|---|---|---|
| **Identifiers** | Name, email address (or Apple relay address), account ID, public handle, IP address, push token | You; Apple or Google sign-in; your device | Provide and secure the Service; sign-in; notifications; support | Service providers (Supabase, Expo, Apple, Google); contractors only if you switch your contact info on or pick a pro; other users see your handle on Public designs | No |
| **Personal information in Cal. Civ. Code § 1798.80(e)** | Name, email, phone number (if you provide it) | You; Apple or Google sign-in | Contractor outreach at your direction; account management | Service providers (Supabase, Resend); contractors you choose | No |
| **Characteristics of protected classifications** | Confirmation that you are 13 or older (age range only) | You | Eligibility | Service providers (Supabase) | No |
| **Commercial information** | Projects, styles, project briefs, budget range, quotes received, timelines | You; AI-generated from your inputs; contractors | Provide the Service; contractor outreach | Service providers (Supabase, OpenRouter, Google, Anthropic, Resend); contractors (only what you switch on) | No |
| **Internet or other electronic network activity** | In-app actions, XP/usage events, likes, saves, remixes, reports and blocks, outreach logs, error logs, device/app/browser info | Your device; your use of the Service | Run gamification and usage limits; security; moderation; debugging | Service providers (Supabase; [NOTE: analytics/crash tool TBD]) | No |
| **Geolocation data** | ZIP code you enter (not precise location; photo GPS data is removed on your device) | You | Find local contractors | Service providers (Supabase, OpenRouter/AI providers for the brief, Resend); contractors (if switched on) | No |
| **Audio, electronic, visual, or similar information** | Room photos you upload; AI-generated design images | You; AI-generated | Generate designs; store your projects; Explore (designs only, if Public) | Service providers (Supabase, OpenRouter, Google, Anthropic); contractors (if switched on); other users (Public designs only) | No |
| **Communications content** (may be sensitive PI) | Chats with Vi; messages with contractors | You; contractors; AI-generated replies | Provide Vi and Inbox; moderation of reported content | Service providers (Supabase, OpenRouter, Google, Anthropic, Resend); the contractor you're messaging | No |
| **Inferences** | We do not create profiles or inferences about you. [NOTE: Update if personalized recommendations are added.] | — | — | — | No |
| **Consent and choice records** | AI consent version and date; privacy choices; settings | You | Legal compliance; honoring your choices | Service providers (Supabase) | No |

We do not collect government IDs, financial account or payment card information, precise geolocation, biometric information, health information, or information about racial or ethnic origin, religion, or sexual orientation. Note that photos of your home could incidentally show personal items or people; please don't upload photos of people without their permission.

Retention periods for each category are described in Section 6.

### California "Shine the Light"

We do not share personal information with third parties for their own direct marketing purposes.

## 11. Information about contractors

When you use "Find me a pro," we contact local contractors by email. If you are a contractor:

- **What we collect:** your business name and business contact information (such as email address, phone number, business address, website, and license number if listed), the messages you send through VisionBuild, and the quotes you provide.
- **Where we get it:** [NOTE: Specify the source(s) of contractor contact info — e.g., publicly available business listings, a licensed data provider, or contractors who sign up. This is required to be disclosed and affects legal risk.] and directly from you when you reply.
- **How we use it:** to send you project briefs that homeowners asked us to send, to deliver your replies and quotes to the homeowner, to log each outreach send, to honor unsubscribe requests, and to prevent abuse.
- **Who sees it:** the homeowner you're responding to, and our service providers (Supabase, Resend, and AI providers when helping format or summarize messages [NOTE: confirm whether contractor replies are processed by AI]).
- **Unsubscribe:** Every outreach email includes an unsubscribe link and our mailing address. If you unsubscribe, we will stop sending you project briefs, and we keep a minimal record of your email address on a suppression list so we don't email you again.
- **Your rights:** California contractors have the same CCPA rights described in Section 10 (know, delete, correct, and non-discrimination). Email [SUPPORT EMAIL] to make a request.

## 12. Where your information is processed

VisionBuild is based in the United States, and our service providers process information in the United States [NOTE: confirm regions for Supabase and the AI providers]. If you use VisionBuild from outside the U.S., your information will be transferred to and processed in the U.S.

## 13. Changes to this Policy

We may update this Privacy Policy from time to time. If we make material changes, we will notify you in the app or by email before the changes take effect, and update the "Last updated" date above. If a change affects how we use photos or chats with AI, we will ask for your consent again.

## 14. Contact us

[COMPANY LEGAL NAME]
[MAILING ADDRESS]
Email: [SUPPORT EMAIL]
Website: https://[WEBSITE DOMAIN]
