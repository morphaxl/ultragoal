# React Native / Expo feature

Use when: building or changing a feature in a React Native or Expo app. Device-only checks are explicit human steps — simulators can't judge feel.
Kind: task

Spec it with a **"What you'll see" block first** (nav map + screen inventory + ASCII wireframe + flow + stated assumptions — see the goal skill's Phase 4): for mobile, *where a screen lives in the tab bar / navigator* is the decision most often lost to prose, so draw the post-change bar and have the user confirm the picture before building.

## Skills to pair
If available in this session (find more via `find-skills` on skills.sh): `vercel-react-native-skills`, `vercel-react-best-practices` — apply while building.

## Rubric
- [ ] Typecheck, lint, tests green — check: `npx tsc --noEmit && npx expo lint && npx jest --ci` exits 0
- [ ] Project health clean — check: `npx expo-doctor` reports no issues (config, SDK-compatible dependency versions)
- [ ] Native build succeeds on BOTH platforms — check: `npx expo prebuild --clean` then `eas build --platform ios --local` and `--platform android --local` (bundle-only smoke: `npx expo export --platform ios --platform android`)
- [ ] No new LogBox warnings and none suppressed — check: exercise changed screens in dev watching LogBox; `grep -rn "ignoreLogs\|ignoreAllLogs" src/` shows no new entries
- [ ] Changed screens render their key elements visibly — check: AGENT-RUN visual smoke (observation, not driving): boot the changed screen in a simulator (or an `expo export` / web build), capture a NON-INTERACTIVE screenshot, and confirm the element the change targets is actually on screen at non-zero size — or assert its measured `onLayout` height/width > 0. Typecheck/lint/build all pass on a component that renders nothing, so this is the cheapest catch for layout collapses (a horizontal virtualized list nested in a vertical scroll measuring to 0 height, a clipped/off-screen view). A static screenshot is an observation, NOT driving a flow — distinct from, and run before, the manual device steps below.
- [ ] New or moved destinations are reachable where the user expects — check: for any added/relocated screen, assert its entry point is present in EVERY navigation variant the app ships (e.g. both the native `NativeTabs` bar and the JS/floating tab bar) — enumerate the nav config (or screenshot the bar) and confirm the tab/link shows, with its unread badge if any. "The screen renders" does not prove "the tab is in the bar"; a `href: null` / hidden route passes a render check while being unreachable. The placement must match the decision stated in the spec's "What you'll see" block.
- [ ] New external/backend calls succeed against the REAL dependency, not just mocks — check: a live smoke (a script or dev-build request) makes one real, authenticated call to the actual staging endpoint and gets a 2xx with the expected shape — exercising the token/headers/handshake end to end. Mocked unit tests prove orchestration, never that the gateway accepts the call; live-test the seam you're least sure of, and do it EARLY, not in the final device round. A self-disclosed "won't run until the secret/env is set" stays an unchecked blocking item.
- [ ] The app degrades gracefully when a new call fails — check: force the new endpoint to 401/403/5xx (bad/expired token, killed network) and confirm the client shows a clear error and stays usable — no global logout, no blank screen, no infinite spinner. Tests the failure's blast radius across the app, not just the happy path.
- [ ] JS-thread ≥55fps on the feature's screens — check: Dev Menu → Show Perf Monitor on a real device; deep traces via React Native DevTools Performance panel (Flipper is deprecated — don't use it)
- [ ] Startup/TTI not regressed, measured in RELEASE mode — check: `npx expo run:android --variant release` + User Timing marks in RN DevTools or Sentry app-start; never measure in dev
- [ ] Gesture feel and keyboard avoidance — check: MANUAL DEVICE STEP — physical iPhone + Android: every gesture tracks the finger, no input hidden by the keyboard
- [ ] Safe areas and deep links — check: MANUAL — notched device/simulator portrait+landscape per screen; `npx uri-scheme open "<app>://<route>" --ios/--android` against a development build lands on the right screen
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or the feature needs a native module change beyond config plugins (scope decision)

## Constraints
- No `LogBox.ignoreLogs` / lint-disable additions to pass checks

## Sources
- https://docs.expo.dev/develop/tools/
- https://reactnative.dev/docs/react-native-devtools
- https://docs.expo.dev/linking/into-your-app/
