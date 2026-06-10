# Streaming / realtime stability

Use when: websockets, live updates, or streaming in an app (RN or web) must survive real network life — reconnects, backgrounding, handoffs, long sessions.
Kind: task

## Skills to pair
`vercel-react-native-skills` for RN socket lifecycle patterns, if available. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Reconnection uses exponential backoff with jitter (base ~1s, ×2, cap ~30s, ±30% jitter, counter resets after stable connection) — check: unit test with fake timers asserting the delay sequence; integration: kill server, observe reconnect timestamps grow then cap
- [ ] State reconciles after reconnect: no stale or duplicate items — check: integration test drops the socket mid-stream, emits server events while down, reconnects, asserts client state equals server state
- [ ] Offline actions queue (bounded, deduplicated, idempotency keys) and flush in order — check: airplane-mode test — 3 actions offline → reconnect → exactly 3 land server-side, in order
- [ ] Background/foreground handled via AppState: heartbeats stop on background, immediate ping+resync on active, listeners removed via subscription.remove() — check: MANUAL DEVICE STEP — background 5+ min, foreground, fresh data within seconds; log listener count stays constant (iOS suspends apps — never rely on background sockets)
- [ ] No memory leak across a long session: heap sawtooths, never monotonic — check: RN DevTools Memory panel (Hermes) heap snapshot before/after 15+ min of traffic; web: Chrome DevTools heap comparison
- [ ] Exactly one connection survives N mount/unmount cycles — check: unit test asserting close() per cleanup; runtime: navigate in/out 10×, active socket count stays 1
- [ ] Wi-Fi↔cellular handoff resumes the stream — check: MANUAL DEVICE STEP — physical device, start session on Wi-Fi, disable it, stream resumes within the backoff cap (simulators can't do real radio handoff)
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or stability requires server-side protocol changes (sequence numbers, resume tokens) — scope decision

## Constraints
- No reconnect-storm risk: prove the jitter spreads N simulated clients' reconnects (no thundering herd)

## Sources
- https://reactnative.dev/docs/appstate
- https://reactnative.dev/docs/react-native-devtools
- https://github.com/facebook/react-native/issues/26731 (iOS background socket termination)
