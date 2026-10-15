# Store-capture mode (App Store screenshots and preview video)

`EXPO_PUBLIC_STORE_CAPTURE=1` is a **build-time** flag. Off by default. With it on, the app hides
everything that isn't live at launch, so it can't land in a store asset:

- the "Join the waitlist" card on Home, Results and the project page
- the pros waitlist setting in Settings
- the Inbox tab (even if outreach is switched on)

Nothing else changes. It's set only by the `store-capture` EAS profile. `base` and `production`
pin it to `"0"`, and `npm run check:store-capture` (in CI) fails if any other profile turns it on.

## Screenshots

```
EXPO_PUBLIC_DEV_MOCK_SESSION=true EXPO_PUBLIC_STORE_CAPTURE=1 npx expo start --web --port 19007
npm run store:capture            # -> /workspace/visionbuild/store-shots/{iphone-6.9,iphone-6.5}/
```

The six slots follow `brand/real/README.md`, in listing order (App Store search shows the first three):
01-home (Home with projects, no waitlist card), 02-style-picker, 03-generating, 04-results
(AI-generated label visible), 05-vi, 06-profile (earned badges). They come out at 1320x2868 (6.9")
and 1284x2778 (6.5"), and the script checks the pixel sizes. It seeds three saved rooms in three
styles (one outdoor), so Home has projects and Profile shows earned badges.

Until real output exists, every frame uses a **labeled placeholder room photo** and a "PLACEHOLDER"
stamp. They're layout proofs and must not be uploaded. The final assets come from the TestFlight
build, using Elimar's own room photos and designs the app actually generated, with nothing touched
up and the AI-generated label visible. They go to Compliance before anything is uploaded.
`--final --photo=<real photo>` drops the stamp.

## Generation timing (for the caption)

```
SUPABASE_URL=... SUPABASE_ANON_KEY=... TEST_USER_JWT=... TEST_PROJECT_ID=... npm run store:time-generations
```

This runs 10 real generations and reports the median and slowest times. It's a report, not a test.
Without the keys it prints what's missing and exits.
