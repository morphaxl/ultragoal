# App-store readiness

Use when: preparing an iOS/Android release for store submission — the dated requirements here change yearly; re-verify them at use time.
Kind: task

## Skills to pair
App-store review skills if present (e.g. an apple-appstore-reviewer skill). Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Google Play target API level current — June 2026: API 35+ required for new apps/updates; **API 36 (Android 16) required from Aug 31, 2026** — target 36 now to avoid the scramble — check: `grep targetSdkVersion android/build.gradle` or `expo-build-properties` in app.json; `npx expo-doctor` flags SDK mismatch
- [ ] Apple privacy nutrition labels match reality, including SDK data collection — check: MANUAL — App Store Connect → App Privacy audited against the actual dependency list (`npx expo install --check`)
- [ ] In-app account deletion exists if accounts exist (Apple 5.1.1(v)): full deletion, easy to find — check: MANUAL DEVICE STEP — create → delete → backend record gone (`curl` the user endpoint expecting 404/410)
- [ ] ATT prompt before any tracking (iOS) + Play Data safety form consistent — check: `grep NSUserTrackingUsageDescription ios/*/Info.plist` (or app.json); fresh install shows the prompt before tracking fires
- [ ] Store assets complete: 1024×1024 iOS icon, Android 512×512 + 1024×500 feature graphic, ≥2 screenshots per platform, adaptive icon — check: `npx expo-doctor` for config; store consoles for assets (MANUAL checklist)
- [ ] Build numbers strictly increase — check: eas.json has `"appVersionSource": "remote"` + `"autoIncrement": true`; `eas build:version:get` matches expectations
- [ ] Crash-free sessions ≥99.5% floor (≥99.95% is the competitive median), alert configured — check: Sentry Release Health / Firebase Crashlytics dashboard for the release candidate
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or a store policy requires a product change (e.g. account deletion flow) — that's its own goal

## Constraints
- Never ship with tracking enabled before the consent prompt path is verified on device

## Sources
- https://support.google.com/googleplay/android-developer/answer/11926878
- https://developer.apple.com/app-store/review/guidelines/
- https://docs.expo.dev/build-reference/app-versions/
