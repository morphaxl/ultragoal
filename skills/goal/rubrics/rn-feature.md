# React Native / Expo feature

Use when: building or changing a feature in a React Native or Expo app. Device-only checks are explicit human steps — simulators can't judge feel.
Kind: task

## Skills to pair
If available in this session (find more via `find-skills` on skills.sh): `vercel-react-native-skills`, `vercel-react-best-practices` — apply while building.

## Rubric
- [ ] Typecheck, lint, tests green — check: `npx tsc --noEmit && npx expo lint && npx jest --ci` exits 0
- [ ] Project health clean — check: `npx expo-doctor` reports no issues (config, SDK-compatible dependency versions)
- [ ] Native build succeeds on BOTH platforms — check: `npx expo prebuild --clean` then `eas build --platform ios --local` and `--platform android --local` (bundle-only smoke: `npx expo export --platform ios --platform android`)
- [ ] No new LogBox warnings and none suppressed — check: exercise changed screens in dev watching LogBox; `grep -rn "ignoreLogs\|ignoreAllLogs" src/` shows no new entries
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
