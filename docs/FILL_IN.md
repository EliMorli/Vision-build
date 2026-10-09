# VisionBuild: what Elimar has to provide before submission

Checked against `d9e0063` plus `release-fixes.patch`, merged into PR #11 together with the legal-website items (sections 2, 7 and 8). Everything else is built.
Enter keys only in your 1:1 secure form or straight into the Supabase / Expo / Apple / Google dashboards, never in the group chat and never in git.

How to read this: **What it is**, then **where it goes**, then **where you get it**, then **what breaks without it**.

---

## 1. Supabase project and secrets (backend)

Create one production Supabase project (US region). Then run `supabase link --project-ref <ref>`, `supabase db push` (migrations 00001–00024) and `supabase functions deploy`.

### Edge Function secrets
Set them in Supabase Dashboard → Edge Functions → Secrets, or with `supabase secrets set NAME=value`. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically, so don't set them.

| Secret | What it is | Where you get it | If it's missing |
|---|---|---|---|
| `APP_ENV` | Set it to `production`. | You choose it. | Missing already counts as production (fail-closed), but set it explicitly. |
| `AI_API_KEY` | Your **OpenRouter** API key. This is the only AI key. There's no OpenAI or Replicate key. | openrouter.ai → Keys. Also turn on **Zero Data Retention** under Settings → Privacy, and turn off "training". | Room analysis, design generation and Vi all fail with 500 errors. |
| `AI_BASE_URL` | Leave it unset. It defaults to `https://openrouter.ai/api/v1`. | n/a | If you set it to anything other than OpenRouter, production refuses to run. |
| `RENDER_PROVIDER` | Leave it unset. It defaults to `openrouter`. | n/a | `replicate` is refused in production. |
| `RESEND_API_KEY` | Resend API key for deletion-confirmation and ops emails. | resend.com → API Keys, after you verify your domain (section 6). | Web deletion requests can't send the confirmation email, so Google Play's web deletion requirement fails. |
| `SUPPORT_EMAIL` | The support address shown in emails and on legal pages. | Your mailbox, for example `support@<domain>`. | Emails show a `[support@yourdomain.com]` placeholder. |
| `BUSINESS_MAILING_ADDRESS` | Postal address for the CAN-SPAM email footer. | Your business or registered-agent address. | Pros outreach can't be turned on. The waitlist "pros are live" email isn't compliant. |
| `UNSUBSCRIBE_SECRET` | A random 32+ character string that signs unsubscribe links. | Generate it with `openssl rand -hex 32`. | With the patch, `unsubscribe` returns 503 and `dispatch-lead` returns 500, which is fail-closed. Before the patch it silently used a guessable default. |
| `CRON_SECRET` | A random string, optional, for calling `retry-account-deletions` by hand. | `openssl rand -hex 32` | Only the service-role path works. That's fine. |
| `OPS_ALERT_EMAIL` | The inbox that gets an alert after 5 failed deletion retries. | Your address. | Alerts are skipped and only a warning is logged. |
| `ALERT_FROM_EMAIL` | The From address for ops alerts, on your verified Resend domain. | For example `alerts@<domain>`. | Alerts are skipped. |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID, 10 characters. | developer.apple.com → Membership. | Sign in with Apple tokens aren't revoked when an account is deleted. That violates App Review **5.1.1(v)**. |
| `APPLE_KEY_ID` | The Key ID of a "Sign in with Apple" key. | developer.apple.com → Keys → + → enable Sign in with Apple → download the `.p8`. | Same as above. |
| `APPLE_PRIVATE_KEY` | The full contents of that `.p8` file, `\n` escapes allowed. | The downloaded `.p8`. It can only be downloaded once, so keep it safe. | Same as above. |
| `APPLE_BUNDLE_ID` | Optional. It defaults to `com.visionbuild.app`. Set it only if you change the bundle id. | n/a | Revocation uses the wrong client id. |
| `APPLE_SERVICES_ID` | Your web Services ID, for example `com.visionbuild.app.signin`. The patch no longer uses it for revocation, but Supabase's Apple provider needs it (below). | developer.apple.com → Identifiers → Services IDs. | Web or Android Apple sign-in fails. |
| `CONTRACTOR_OUTREACH_ENABLED` | Leave it unset or `false` for launch. | n/a | n/a. It stays off until contractor sign-up exists. |
| `PUBLIC_SUPABASE_URL` | **Local dev only.** Set it to `http://127.0.0.1:54321` so `analyze-room` accepts local signed URLs. | n/a | It isn't needed in production. |

### Vault secrets (for the hourly deletion-retry cron)
Set them in Dashboard → Project Settings → Vault, or with SQL `select vault.create_secret('<value>', '<name>');`.

| Name | Value | If it's missing |
|---|---|---|
| `project_url` | `https://<ref>.supabase.co` | `deletion_cron_ready()` reports false and failed deletions never retry. |
| `service_role_key` | The service-role key (Dashboard → API) | Same as above. |

Also turn on the **pg_cron** and **pg_net** extensions (Database → Extensions) **before** `db push`.

### Auth settings (Dashboard → Authentication)
- **URL configuration → Redirect URLs:** add `visionbuild://auth/callback`. Without it, Google sign-in (and Apple on Android) bounce back to the Site URL and the app never gets the session.
- **Providers → Google:** turn it on. You'll need a Web client ID and secret from Google Cloud Console (OAuth consent screen → External, with app name, support email, privacy URL and logo). Without it the "Continue with Google" button fails.
- **Providers → Apple:** turn it on.
  - **Client IDs:** `com.visionbuild.app,<your Services ID>`. **You need the bundle id here** because the patch uses native iOS Sign in with Apple (`signInWithIdToken`).
  - Secret key: generated from the Services ID with the `.p8`. Supabase has a generator.
  - Without this, Apple sign-in fails on iOS, and **guideline 4.8 fails**.
- **Email provider:** you can turn off password sign-up, since the app only uses OAuth.

---

## 2. Expo / EAS (build and client env)

| Item | Where | Where you get it | If it's missing |
|---|---|---|---|
| Expo account and project | Run `npx eas init` in the repo. It writes `extra.eas.projectId` into app.json, so commit that. | expo.dev | `eas build` won't run. |
| `EXPO_PUBLIC_SUPABASE_URL` | Set it with `eas env:create --environment production --visibility plaintext` (repeat for preview). | Supabase → Settings → API | The app can't reach the backend, so nothing works. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Same as above. It's public by design, and RLS protects the data. | Supabase → Settings → API (anon or publishable key) | Same as above. |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | Same as above. | Your support mailbox | The "Contact support" links are hidden or show a placeholder. Guideline 1.2 and 5.1.1 need contact info. |
| `EXPO_PUBLIC_DEV_MOCK_SESSION` | Already `false` in the `base`/preview/production profiles of `eas.json`. **Never set it to true for production.** | n/a | Mock mode is impossible in release builds anyway, because it's gated on `__DEV__`, which is false in production. The exported production bundle contains no mock strings. |
| `EXPO_PUBLIC_LEGAL_BASE_URL` | Set it with `eas env:create --environment production --visibility plaintext` (repeat for preview), in your local `.env`, **and** as a GitHub Actions repository variable with the same name (Settings → Secrets and variables → Actions → Variables). Use the https URL where `web-legal/dist` is deployed, e.g. `https://visionbuild.app/legal` (no trailing slash needed). | Your domain (section 7) | The app opens the placeholder `https://visionbuild.app/legal/...` from Settings → About, sign-in and the consent screen. The release CI step fails: gate 1 rejects an unset, http or placeholder URL, and gate 2 fetches `<url>/privacy` and fails unless its `<meta name="policy-version">` equals `PRIVACY_POLICY_VERSION` (currently 2). |

The production profile uses `appVersionSource: remote` with `autoIncrement`, so EAS manages the iOS buildNumber and Android versionCode. Change `version` in app.json only for user-facing releases.

---

## 3. Apple: Developer Program and App Store Connect

| Item | Where it goes | Where you get it | If it's missing |
|---|---|---|---|
| Apple Developer Program membership ($99/yr). Enroll as an **Organization** (needs a D-U-N-S number) if you want the seller name to be your LLC. | n/a | developer.apple.com/programs | You can't submit at all. |
| **Team ID** | `eas.json` → `submit.production.ios.appleTeamId` (replace `REPLACE_WITH_APPLE_TEAM_ID`), plus the Supabase secret `APPLE_TEAM_ID` | Membership page | `eas submit` fails. |
| **Apple ID email** | `eas.json` → `submit.production.ios.appleId` | Your Apple ID | `eas submit` asks for it interactively. |
| **App record** with bundle ID `com.visionbuild.app`. EAS registers the App ID automatically with the Sign in with Apple capability, because `usesAppleSignIn` is true. | App Store Connect → Apps → + | App Store Connect | Nothing to upload to. |
| **ASC App ID** (numeric "Apple ID" of the app record) | `eas.json` → `submit.production.ios.ascAppId` | ASC → App Information | `eas submit` fails. |
| **Sign in with Apple key** (`.p8` plus Key ID) | Supabase secrets `APPLE_KEY_ID` and `APPLE_PRIVATE_KEY`, plus the Supabase Apple provider secret | developer.apple.com → Keys | Deletion can't revoke Apple tokens (**5.1.1(v)**). |
| **Services ID** for web/Android Apple sign-in. Its return URL is `https://<ref>.supabase.co/auth/v1/callback`. | Supabase Apple provider, `APPLE_SERVICES_ID` | developer.apple.com → Identifiers → Services IDs | Apple sign-in fails on Android and web. iOS uses the native flow. |
| App Store Connect API key (recommended, for non-interactive `eas submit`) | `eas credentials` / ASC → Users and Access → Keys | ASC | Submit stays interactive. |
| **App Privacy** answers | ASC → App Privacy | Copy from `/workspace/visionbuild/launch/store-submission-answers.md` §1. They now match `ios.privacyManifests` exactly. | Review is blocked. |
| **Age rating**, Content Rights, Export Compliance | ASC | Same file, §2–3. Export compliance is already answered in app.json (`usesNonExemptEncryption: false`). | Review is blocked. |
| **Demo account for App Review** (see section 9) | ASC → App Review Information → Sign-in required | You | **Guideline 2.1 rejection.** |
| Review contact (name, phone, email) | ASC → App Review Information | You | You can't submit. |
| Support URL and Marketing URL | ASC → App Information | Your site, for example `https://<domain>/support` | You can't submit. The Support URL is required. |
| Privacy Policy URL | ASC → App Privacy | `https://<domain>/privacy` (PR #11's site) | You can't submit. |
| Copyright line | ASC → version page | For example "© 2026 <Company LLC>" | You can't submit. |

---

## 4. Google Play

| Item | Where it goes | Where you get it | If it's missing |
|---|---|---|---|
| Play Console developer account ($25). Use an **Organization** account with a D-U-N-S number to skip the 12-tester/14-day closed test that new personal accounts require. | n/a | play.google.com/console | You can't publish. A personal account adds at least 14 days. |
| App created with package `com.visionbuild.app` | Play Console | n/a | n/a |
| Upload key / app signing | Let EAS generate and manage the keystore (`eas credentials`) and use Play App Signing. | EAS | n/a |
| **Service account JSON** for `eas submit` | Save it as `./secrets/google-play-service-account.json` (gitignored by the patch). The path is set in `eas.json`. | Google Cloud → IAM → Service account → key, then grant it access in Play Console → Users and permissions. | `eas submit -p android` fails. Upload the first AAB by hand anyway, because Google requires that. |
| Data safety form, App content, target audience 13+, IARC rating, Ads = No | Play Console | Copy from `store-submission-answers.md` §4–5 | Review is blocked. |
| **Data deletion URL** `https://<domain>/delete-account` | Play Console → Data safety | PR #11's legal site | **Play policy rejection.** |
| Photo/video permissions declaration: **none**. After the patch the merged manifest requests only CAMERA and INTERNET (plus VIBRATE and network-state from libraries). | Play Console → App content | n/a | If READ_MEDIA_IMAGES were still there, Google would reject for occasional photo picking. The patch blocks it. |

---

## 5. OpenRouter
- One API key goes in the Supabase secret `AI_API_KEY`.
- **Settings → Privacy:** turn on **Zero Data Retention** only and turn off "Allow training". The code also sends `zdr`/`data_collection: deny`/no-fallback on every request, but the account setting is what the Privacy Policy promises.
- Add credits and set a monthly **spend limit**.
- If the ZDR toggle is missing, the Privacy Policy and AI consent screen claims ("providers don't keep or train on your data") become false. That's a legal risk.

## 6. Resend
- Add your domain, then add the **SPF, DKIM and DMARC** DNS records Resend shows you, and wait until it says "Verified".
- Create an API key and put it in `RESEND_API_KEY`.
- Unverified domain means deletion confirmation emails bounce or land in spam, so Google's web-deletion flow breaks.

## 7. Domain and legal site hosting
- Register the domain. Everything in the code currently points at `visionbuild.app` placeholders, and PR #11 adds the gate.
- Build the legal website with `npm run legal:build -- --release` (it fails until every DRAFT, `[NOTE]`, `[CONFIRM]` and placeholder is resolved) and upload `web-legal/dist/` to a static host (Vercel, Netlify, Cloudflare Pages or a public Supabase Storage bucket). Nothing deploys it automatically. Steps are in `docs/HANDOFF.md` → Legal pages. **Recommended path: `https://<domain>/legal`**, so it can't collide with the app's own web deletion form at `https://<domain>/delete-account`. The site serves:
  - `/legal/terms` and `/legal/terms/v1`
  - `/legal/privacy` (v2, with version and effective date) plus `/legal/privacy/v1` and `/legal/privacy/v2`
  - `/legal/licenses`
  - `/legal/delete-account`: explains in-app, web-form and email deletion, and what is deleted and kept. Use this as the Google Play **Data deletion URL**. The web request form it links to (`https://<domain>/delete-account`, the Expo web route that calls `request-account-deletion`) must also be hosted.
  - `/legal/support`: use it as Apple's **Support URL**.
- Then set `EXPO_PUBLIC_LEGAL_BASE_URL` to `https://<domain>/legal` (section 2). The Apple Privacy Policy URL and Play privacy policy are `https://<domain>/legal/privacy`.
- DNS for the Resend domain verification (section 6).
- Without it, the Privacy URL, Support URL and Data-deletion URL are all required by Apple and Google, so you can't submit. PR #11's release gate also fails.

## 8. Business and legal text
| Item | Where it goes | If it's missing |
|---|---|---|
| Legal entity name and type (or "Elimar Morli" as an individual) | `lib/config/business.ts`, `supabase/functions/_shared/business.ts`, and the `{{COMPANY_LEGAL_NAME}}`/`{{ENTITY_TYPE}}` tokens in `content/legal/*.md` | `scripts/strip-legal-drafts.js` (the CI "Validate legal pages for release" step on main/tags) fails while `{{…}}` or `[NOTE]` markers remain. |
| Mailing address | Same files, plus `BUSINESS_MAILING_ADDRESS` | Same as above, plus a CAN-SPAM issue. |
| Website domain | `business.ts` `websiteDomain`, `{{WEBSITE_DOMAIN}}` | Same as above. |
| Effective date | Privacy Policy v2: `effectiveDate` in `web-legal/versions.json` (currently `[EFFECTIVE DATE: fill in the launch date]`). Terms v1: same file. The app's unlinked `/terms` and `/privacy` routes use `January 1, 2027`. | `npm run legal:build -- --release` and the release CI step fail while the bracket placeholder remains. |
| Legal text source | The current policy text lives in `app/privacy.tsx` and `app/terms.tsx` (the markdown the site is built from and that `strip-legal-drafts.js` checks). `content/legal/*.md` and `/workspace/visionbuild/legal/v2` are reference copies. When the attorney edits the text, update `app/<doc>.tsx`; if it's a new version, follow "Publishing a new policy version" in `docs/HANDOFF.md`. | The site and the release gates check the wrong text. |
| Attorney review: resolve every `[NOTE]`, `[CONFIRM]` and `[ATTORNEY DECISION]` in `content/legal/privacy-policy.md` and `terms-of-service.md`, including B7 (the 13+ "recorded" claim and Vi chats "saved" claim are false today) | Legal docs (PR #11 regenerates privacy v2) | The release gate fails, and the policy would mismatch the app, which is a 5.1.1 risk. |
| Trademark check on the name "VisionBuild" | n/a | Rebranding risk after launch. |
| Report-response SLA (for example "we review reports within 24 hours") and who moderates | Terms (UGC section) plus your own process. Until the admin tool exists, act on reports in the Supabase dashboard (`reports`, `moderation_log`). | Guideline 1.2 requires "timely" action on reports. |

## 9. Demo account for App Review (guideline 2.1)
Sign-in only uses Apple or Google, so:
- Create a **dedicated Google account**, for example `visionbuild.review@gmail.com`. Turn **2-step verification off** (reviewers can't receive your codes), sign into the app once, accept AI consent, and create one project with designs so the reviewer sees real content.
- Put the email and password in ASC → App Review Information, and in Play Console → App access.
- In the review notes, say: "Sign in with Google using the account above, or Sign in with Apple with any Apple ID. The camera is optional; use 'choose from library'." There's a draft at `/workspace/visionbuild/launch/app-review-notes.md`.
- Without this, reviewers can't get past sign-in and you get a **2.1 rejection**.

## 10. Store listing copy and screenshots
| Item | Spec | Owner |
|---|---|---|
| App name and subtitle (≤30 characters each), promotional text, description, keywords (≤100 characters) | ASC | You (Ui can draft) |
| iPhone screenshots: **6.9"** (1320×2868 or 1290×2796), at least 3. 6.5" is optional. iPad isn't needed because the patch sets `supportsTablet: false`. | ASC | Ui, after the keys are in, from a real build |
| Play: short description (≤80), full description (≤4000), at least 2 phone screenshots, feature graphic 1024×500 (`assets/store/feature-graphic.png` exists), 512×512 icon | Play Console | Ui |
| Category: Lifestyle (or Productivity) | Both stores | You |
