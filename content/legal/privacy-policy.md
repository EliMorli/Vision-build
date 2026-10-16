> **DRAFT — not legal advice; review with an attorney before publishing.**

# VisionBuild Privacy Policy

**Effective date:** {{EFFECTIVE_DATE}}
**Last updated:** {{EFFECTIVE_DATE}}

This Privacy Policy explains what information VisionBuild collects, how we use it, who receives it, how long we keep it, and the choices and rights you have. It covers the VisionBuild mobile app (iOS and Android), the web pages that support it (such as {{WEBSITE_DOMAIN}}/delete-account), and related services (together, the "Service").

VisionBuild is operated by {{COMPANY_LEGAL_NAME}}, a {{ENTITY_TYPE}} ("VisionBuild," "we," "us," or "our"). You can reach us at {{SUPPORT_EMAIL}} or {{MAILING_ADDRESS}}.

> [NOTE: If no company has been formed by launch, the operator is Elimar Morli as an individual. Fill {{COMPANY_LEGAL_NAME}} and {{ENTITY_TYPE}} to match.]

## The short version

- You sign in with Apple or Google. We never see your Apple or Google password.
- You must be 13 or older.
- **Your photos and chats are sent through OpenRouter only to AI providers that don't keep or train on your data, and only to create your designs.** We ask for your permission before any AI processing, and you can choose "Not now."
- Location and other hidden data (EXIF) are removed from your photos before they are uploaded.
- Your original room photos are stored privately. Only you can see them.
- Projects are private by default. If you make a project Public, only the AI-generated designs are shown on Explore. Your original photo is never made public.
- We don't use analytics, crash reporting, ads, or tracking. We don't sell your personal information or share it for cross-context behavioral advertising.
- If you join the pros waitlist, we save your account email (and the project ID, if you joined from a project) to send you one email when pros are live. You can leave the list in Settings.
- You can delete your account in the app or at {{WEBSITE_DOMAIN}}/delete-account.

---

## 1. Information we collect

The table below lists what we collect, where it comes from, why, and who receives it. "Supabase" is our database, login, and file storage provider. Section 4 explains each recipient.

| Data category | What it includes | Source | Why we use it | Who receives it |
|---|---|---|---|---|
| **Account information** | Name, email address (which may be an Apple "Hide My Email" relay address), the account ID from Apple or Google, the profile picture link Google or Apple provides (if any), and a profile photo if you upload one (stored privately) | Apple or Google when you sign in | Create and secure your account; sign you in; contact you about your account | Supabase; Apple or Google (they already have it) |
| **Public profile** | The name or handle and the level shown next to your public designs | Your account; your XP | Show who made a public design | Supabase; other users (only for designs you make Public) |
| **Room photos** | Photos you take or upload, after EXIF and location data are removed on your device | You | Analyze the room and create designs | Supabase (private storage); OpenRouter and Google (Gemini) for analysis and rendering |
| **Room analysis** | The AI's description of the room (room type, current style, estimated size, key features) | Created by AI from your photo | Create designs that fit your room | Supabase; OpenRouter and AI providers when making designs |
| **Designs** | AI-generated design images, the style you picked, your selected design, project names | You; created by AI | Show your designs and keep your project library | Supabase; other users only if you make the project Public |
| **Vi chats and design briefs** | Messages you send to Vi, our AI assistant, and Vi's replies; the design brief created for your project | You; created by AI | Answer your questions; help you plan your design. Vi chats are sent to the AI to answer you and are **not saved** on our servers. Design briefs are saved with your project. | OpenRouter and Anthropic (Claude) for chats; Supabase for design briefs |
| **Pros waitlist** | The email address on your account, plus the project ID if you joined from a project (from Results or the "Pros are coming soon" screen). Joining from Home saves one general entry per person with your email only. | You (when you tap "Join the waitlist"); your account | Send you a one-time email when pros are live on VisionBuild | Supabase; Resend (to send that one email) |
| **AI consent records** | Your user ID, the consent version, and the date and time you agreed | Created when you agree | Prove and enforce your choice; our servers refuse AI requests without a current consent record | Supabase |
| **Settings and privacy choices** | Your Public/Private default, Reduce Motion setting, AI choice, and "Your Privacy Choices" selections | You | Remember your settings across devices | Supabase |
| **Reports and blocks** | What you reported or blocked, the reason you picked, and when | You | Review reports, enforce our rules, hide blocked users from you | Supabase; our moderators |
| **Usage counts** | A record each time you use an AI feature (for example, a room analysis or a set of designs) | Created when you use the Service | Apply daily usage limits and prevent abuse | Supabase |
| **XP, levels, and badges** | XP events (for example, finishing a design) and the level calculated from them | Created when you use the Service | Run the game features | Supabase; your level is shown on your public designs |
| **Account deletion requests (web)** | The email you enter, a scrambled (hashed) copy of the confirmation link, the IP address the request came from, an optional reason you type, and the request's status and times | You; your browser | Confirm it's really you, prevent abuse, and complete the deletion | Supabase; Resend (to email the confirmation link) |
| **Support messages** | Anything you send to {{SUPPORT_EMAIL}} | You | Answer you and fix problems | Our email provider [NOTE: Name the support mailbox provider, for example Google Workspace, if it should be listed.] |
| **Technical data** | IP address, device and browser type, app version, timestamps, and server error logs, collected automatically when the app talks to our servers | Your device | Run, secure, and debug the Service | Supabase |

### What we don't collect

- **No precise location.** Photo location (GPS/EXIF) data is removed on your device before upload. We don't ask for device location.
- **No passwords.** We never receive your Apple or Google password.
- **No payment information.** The Service is free and has no payments.
- **No analytics, crash reporting, advertising, or tracking tools.** None are in the app at launch. If we ever add one, we will update this Policy first, before the tool is turned on.
- **No contacts, microphone, or health data.**

Photos of your home could accidentally show people, documents, or personal items. Please don't upload photos of people without their permission, and crop out anything you don't want analyzed.

## 2. How we use your information

We use your information only to:

- **Provide the Service:** sign you in, store your projects, create designs, run Vi, and show your library.
- **Run public features:** show designs from projects you make Public on Explore, with your name or handle and level.
- **Run the game features:** XP, levels, and badges.
- **Send emails you need or ask for:** account deletion confirmations, and, if you joined the pros waitlist, one email telling you pros are live, sent through Resend.
- **Run the pros waitlist:** if you tap "Join the waitlist" (on Home, on Results, or on the "Pros are coming soon" screen), we save your account email and, when you join from a project, that project's ID. We use it only to send you one "pros are live" email. That email includes an unsubscribe link and our mailing address. Joining the waitlist doesn't earn XP, and we don't use it for other marketing.
- **Keep the Service safe:** apply daily AI limits, review reports, act on blocks, remove content that breaks our Terms, and prevent fraud and abuse.
- **Fix problems:** troubleshoot errors using server logs.
- **Follow the law:** respond to legal requests and enforce our Terms of Service.

We do **not** use your photos, chats, or designs to train AI models, and neither do the AI providers we use. We don't use your information for advertising. We don't send marketing emails at launch. [NOTE: The Settings screen in the code has a "Marketing Emails" toggle. Remove it for launch, or keep it off and add CAN-SPAM-compliant marketing before ever sending one.]

## 3. AI processing

VisionBuild uses outside AI models to analyze rooms, create designs, and run Vi.

- **How it works.** Requests are sent from our servers through **OpenRouter**, an AI routing service, to these providers:
  - **Room analysis:** Google Gemini 2.5 Pro.
  - **Vi chat and the design brief:** Anthropic Claude.
  - **Design images:** Google's Gemini image model, through Google Vertex.
- **No keeping, no training.** Your photos and chats are sent through OpenRouter only to AI providers that don't keep or train on your data, and only to create your designs. Our requests tell OpenRouter to deny data collection, require zero data retention, and never fall back to other providers. If no provider meets these rules, the request fails rather than going somewhere else.
- **Your permission comes first.** Before any AI processing, we show you a consent screen and you choose to continue or "Not now." If you agree, we save a consent record with your user ID, the consent version, and the time. Our servers refuse any AI request that doesn't have a consent record for the current version. When we change how AI processing works, we ask again.
- **Changing your mind.** If you choose "Not now," nothing is sent to AI providers, and AI features won't work until you agree. You can withdraw consent in Settings → Your Privacy Choices. [NOTE: The code has an "Opt out of AI processing" switch, but the server doesn't check it yet. The server must refuse AI requests when it's on before this sentence is true.]
- **How the AI sees your photo.** To analyze or redesign a photo, our server gives the AI provider a private link to it that expires in one hour.
- **AI can be wrong.** Designs are inspiration, not construction plans or price quotes. See our Terms of Service.

> [NOTE: Before launch, confirm in the OpenRouter account that zero data retention is enforced for every model in use, and that renders are actually routed to Google Vertex. Update this list whenever a model or provider changes.]

## 4. Who receives your information

We don't sell your personal information, and we don't share it for cross-context behavioral advertising. We share it only as described here.

### Service providers

These companies process information for us, only on our instructions, to run the Service:

| Provider | What they do for us | Information involved |
|---|---|---|
| **Supabase** | Database, sign-in, and file storage | Everything listed in Section 1 that we store |
| **OpenRouter** | Routes AI requests (no data collection, zero data retention, no fallbacks) | Photos (through one-hour links), room analysis, chats, style choices |
| **Google (Gemini, including through Google Vertex)** | Room analysis and design images | Photos, room analysis, style choices |
| **Anthropic (Claude)** | Vi chat and design briefs | Chats and project details used for the brief |
| **Resend** | Sends account deletion confirmations and the one-time "pros are live" waitlist email | Your email address and the email's content |
| **Apple and Google** | Sign-in | Sign-in identifiers they already hold |

> [NOTE: Fill in where data is stored (the Supabase project region) and confirm that each provider has data processing terms in place.]

### Other users — only designs you make Public

Projects are **Private** by default. If you make a project **Public**, you'll be asked to confirm. Only the **AI-generated designs** are copied to public storage and shown on Explore, with your name or handle and level. **Your original room photo, chats, and briefs are never made public.** Other users can view public designs.

If you switch a project back to **Private**, we remove its public copies and it leaves Explore. Someone could also have taken a screenshot while it was public.

### Moderators

People we authorize to review reports can see reported content and related account details, only to handle the report.

### Legal and safety reasons

We may disclose information if we believe in good faith that the law requires it, or that it's needed to protect the rights, safety, or property of our users, the public, or VisionBuild.

### Business changes

If VisionBuild is involved in a merger, acquisition, financing, reorganization, or sale of assets, information may be transferred as part of that deal. This Policy will still apply to it.

### Pros (coming soon)

There are no contractors or pros on VisionBuild at launch, and we don't share your information with any, including waitlist entries. When pros are available, we'll update this Policy, explain how sharing works, and ask you first.

## 5. Your choices in the app

- **AI consent:** agree, or choose "Not now." You can withdraw it later in Settings → Your Privacy Choices.
- **Public / Private:** choose for each project, and set your default in Settings.
- **Your Privacy Choices:** Settings → Your Privacy Choices, to manage your AI choice and send privacy requests.
- **Report and Block:** report content or block users you don't want to see.
- **Pros waitlist:** join with "Join the waitlist"; leave at any time with the **Pros waitlist** switch in Settings, or the unsubscribe link in the "pros are live" email.
- **Delete account:** in the app or on the web (Section 7).

Your settings and privacy choices are saved to our servers, so they follow you to any device you sign in on. [NOTE: In the current code, notification, marketing, and Public-by-default settings are kept only on the screen and are lost, and Reduce Motion is saved only on the device. Only the AI opt-out is saved to the server.]

**Global Privacy Control (GPC).** We don't sell or share personal information, so there is nothing to opt out of. If our practices ever change, we will treat a GPC signal from a browser as a valid opt-out request.

## 6. How long we keep information

We keep information only as long as we need it for the reasons in this Policy. Proposed periods:

| Information | How long we keep it |
|---|---|
| Account information and public profile | Until you delete your account [CONFIRM] |
| Room photos, room analysis, designs, design briefs | Until you delete them or your account [CONFIRM] |
| Public copies of designs | Until you switch the project to Private, delete it, or delete your account [CONFIRM] |
| AI consent records | While your account exists, and deleted with your account [CONFIRM] [NOTE: The code deletes consent records with the account. The attorney may want a minimal record kept longer as proof of consent.] |
| Usage counts (for daily limits) | 30 days [CONFIRM] [NOTE: Limits only need 24 hours of data. The code currently keeps these until the account is deleted, so a cleanup job is needed.] |
| XP, levels, badges | Until you delete your account [CONFIRM] |
| Settings and privacy choices | Until you delete your account [CONFIRM] |
| Pros waitlist entries | Until you leave the list (Settings → Pros waitlist, or the unsubscribe link), you delete your account, or 30 days after we send the "pros are live" email, whichever comes first [CONFIRM] |
| Reports you file and moderation records | 1 year after the report is closed, longer if needed to enforce a ban or for legal reasons [CONFIRM] [NOTE: The code deletes the reports you filed when you delete your account. Reports filed about you are kept.] |
| Blocks | Until you unblock or delete your account [CONFIRM] |
| Web account deletion requests (email, IP address, status) | 90 days after the request is completed or expires, then deleted [CONFIRM] [NOTE: No cleanup job exists in the code yet.] |
| Support emails | 2 years after the last message [CONFIRM] |
| Server and technical logs | Up to 30 days [CONFIRM] [NOTE: Depends on the Supabase plan.] |
| Backups | Deleted data may stay in backups for up to 30 days before being overwritten [CONFIRM] [NOTE: Depends on the Supabase plan.] |
| Data sent to AI providers | Not kept by the providers (zero data retention) |

We may keep information longer if the law requires it or to resolve disputes, prevent fraud or abuse, or enforce our Terms.

## 7. Deleting your account

- **In the app:** Profile → Settings → Delete account. This deletes your account, projects, photos, designs, and related data from our database and from both our private and public storage, takes your designs off Explore, and revokes Sign in with Apple if you used it.
- Deleting your account also deletes your pros waitlist entries.
- **On the web (if you're signed out or can't use the app):** go to **https://{{WEBSITE_DOMAIN}}/delete-account** and enter your email address. We'll email you a single-use confirmation link that works for 24 hours. Nothing is deleted until you open the link and press the delete button on the confirmation page.
- **By email:** write to {{SUPPORT_EMAIL}} from the email address on your account.

Deletion can't be undone. Some information may remain for a limited time as described in Section 6, such as backups until they are overwritten and records we must keep.

## 8. Security

We use reasonable safeguards, including encryption in transit, access rules that keep each user's data separate, private storage for original photos with links that expire after one hour, and removing location data from photos before upload. No system is completely secure. If a breach affects your personal information, we will notify you as the law requires.

> [NOTE: Confirm encryption at rest (a Supabase default), and list who has admin access to the database and the moderation tool.]

## 9. Children and teens

VisionBuild is not for children under 13. You must confirm you are 13 or older to sign in. We don't knowingly collect personal information from children under 13. If we learn we have, we will delete it. If you believe a child under 13 is using VisionBuild, contact {{SUPPORT_EMAIL}}.

If you are 13 to 17, please use VisionBuild only with a parent's or guardian's permission. We don't sell or share anyone's personal information, including that of users under 16.

## 10. Your California privacy rights (CCPA/CPRA)

If you live in California, the California Consumer Privacy Act, as amended by the California Privacy Rights Act ("CCPA"), gives you these rights.

> [NOTE for attorney: The CCPA applies only to businesses that meet certain size thresholds, and VisionBuild may not meet them yet. This section is written to comply anyway.]

### Your rights

- **Right to know.** You can ask what personal information we've collected about you, where it came from, why we collected it, who we disclosed it to, and for a copy of the specific information.
- **Right to delete.** You can ask us to delete personal information we collected from you, with some legal exceptions.
- **Right to correct.** You can ask us to correct inaccurate personal information.
- **Right to opt out of sale or sharing.** We **don't sell** your personal information and **don't share** it for cross-context behavioral advertising, and we haven't in the past 12 months. If that ever changes, we'll update this Policy first and give you a way to opt out.
- **Right to limit use of sensitive personal information.** We use sensitive personal information only as needed to provide the Service you ask for and for other purposes the CCPA allows, such as security. We don't use it to infer things about you, so this right doesn't come into play. [ATTORNEY DECISION: Confirm whether anything we collect counts as "sensitive personal information" (for example, the content of Vi chats, or a Hide My Email address combined with sign-in) and whether this statement is correct.]
- **Right to non-discrimination.** We won't deny you the Service, charge you differently, or give you a lower level of service for using your rights.

### How to make a request

- **In the app:** Settings → Your Privacy Choices, or Settings → Delete account.
- **On the web:** https://{{WEBSITE_DOMAIN}}/delete-account (for deletion).
- **By email:** {{SUPPORT_EMAIL}}, subject line "Privacy Request."

### Verification

Before acting on a request, we confirm it's really you. Requests made in the app while you're signed in are verified by your sign-in. Web deletion requests are verified by the confirmation link we email to your account's address. For email requests, we'll ask you to confirm you control the email address on your account, and we may ask for details that match our records. We use verification information only to verify your request.

### Authorized agents

You can have an authorized agent make a request for you. We'll ask the agent for your signed permission (or a valid power of attorney), and we may ask you to verify your identity directly and confirm you gave permission.

### Timing

We'll confirm we got your request within 10 business days and respond within **45 calendar days**. If we need more time (up to another 45 days), we'll tell you why. Requests are free.

### CCPA categories (past 12 months)

| CCPA category | What we collect | Sold or shared? |
|---|---|---|
| Identifiers | Name, email or relay email, account ID, IP address | No |
| Customer records (Cal. Civ. Code § 1798.80(e)) | Name, email | No |
| Internet or other electronic network activity | Usage counts, XP events, reports, blocks, server logs | No |
| Audio, electronic, visual, or similar information | Room photos and AI-generated designs | No |
| Inferences | None. We don't build profiles about you. | No |
| Other (content and choices) | Design briefs, consent records, settings, pros waitlist entries | No |

Sources, purposes, recipients, and retention for each are in Sections 1, 2, 4, and 6. We disclose these categories for business purposes only to the service providers in Section 4, and designs you make Public to other users at your direction.

We don't collect precise geolocation, government IDs, financial or payment information, biometric data, or health information.

### California "Shine the Light"

We don't share personal information with third parties for their own direct marketing.

## 11. Where your information is processed

VisionBuild is based in the United States, and our providers process information in the United States. [NOTE: Confirm the regions for Supabase and the AI providers.] VisionBuild is meant for users in the United States.

## 12. Changes to this Policy

We'll update this Policy before we change how we handle your information, including before adding any analytics, crash reporting, advertising, or tracking tools. If a change is material, we'll tell you in the app or by email before it takes effect. If a change affects how your photos or chats are processed by AI, we'll ask for your consent again.

## 13. Contact us

{{COMPANY_LEGAL_NAME}}
{{MAILING_ADDRESS}}
Email: {{SUPPORT_EMAIL}}
Website: https://{{WEBSITE_DOMAIN}}
