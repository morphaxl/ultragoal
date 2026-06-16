# QA capability map

Use this before finalizing a rubric. The point is not to add every possible check; it is to choose the lowest-cost observation that actually proves the claim's layer. If the claim promises behavior, pixels, navigation, device feel, or a real dependency, a static proxy is not enough.

## Choose the proof rung

| Claim type | Minimum honest proof | Good command/check shape | When to escalate |
|---|---|---|---|
| Code wiring, types, imports | Static command | `pnpm typecheck`, targeted lint, `tsc --noEmit` | Escalate when the wording says "renders", "visible", "clicks", "reachable", "succeeds", or "feels" |
| Pure logic | Unit or property test | `pnpm vitest run path/to/test` with edge cases | Escalate when the logic crosses process, network, auth, DB, filesystem, clock, or platform boundaries |
| HTTP/API behavior inside the repo | Real local request | Start server with logs captured, `curl`/Playwright/API client returns expected status + shape | Escalate to staging/live when auth, headers, gateway, hosted runtime, DB, queue, webhook, or third-party acceptance is the unknown |
| External service, auth, DB, gateway | Live/staging smoke | one real authenticated request returns `2xx` and persisted/read-back evidence | Add a negative smoke: `401/403/5xx/timeout` produces clear error and no app-wide breakage |
| Web UI renders | Browser observation | Playwright screenshot or assertion: visible element, non-zero box, no console/page errors | Add multiple viewport checks when layout is responsive or nav changes |
| Web UI navigation/reachability | Browser click path | Playwright finds the visible entry point, clicks it, lands on the expected route/state | Add every layout/nav variant: mobile nav, desktop nav, hidden menu, auth/non-auth if relevant |
| Canvas/3D/game UI | Pixel/canvas observation | screenshot plus nonblank/canvas pixel check and a moving/interacting state if expected | Add frame-to-frame or interaction checks when animation/gameplay is the deliverable |
| React Native screen renders | Simulator/device screenshot or measured layout | non-interactive simulator screenshot, Expo web smoke, or `onLayout` assertion with width/height > 0 | Add physical device when feel, performance, camera, push, biometrics, deep links, keyboard, safe areas, or native modules matter |
| React Native navigation/reachability | Navigator/tab observation | screenshot/enumerate every tab/nav variant and deep-link to changed routes | Add both iOS and Android for platform-specific navigators or native tabs |
| Gesture/keyboard/performance feel | Manual physical-device step | exact user/device action and expected observation | Do not let this be the only proof for basic render/reachability; run agent observations first |
| Performance | Repeatable measure | immutable bench command with baseline, variance, threshold, and output line | Add pessimistic double-runs near threshold or for flaky environments |
| Security/privacy | Negative and abuse cases | denied access, bad token, cross-tenant attempt, no secret in bundle/log/diff | Add live boundary smoke where the risk is in deployed policy or provider behavior |

## Write the rubric item at the right layer

Use separate items when proof rungs differ:

```markdown
- [ ] Payment button is wired to the checkout action — check: `pnpm typecheck && pnpm vitest run checkout.test.ts` exits 0
- [ ] Payment button is visible and clickable in the browser — check: `pnpm exec playwright test e2e/checkout-visible.spec.ts` confirms a non-zero button box and no console/page errors
- [ ] Checkout session succeeds against Stripe test mode — check: `node scripts/smoke-checkout.mjs --env staging` returns `2xx` and a persisted session id
- [ ] Checkout failure degrades safely — check: `node scripts/smoke-checkout-failure.mjs --status 402` shows a clear user error and no global logout/blank state
```

Do not combine those into one broad "checkout works" item. A verifier can only judge what the check observes.

## Agent-run vs user-run

- Prefer agent-run observations for anything non-interactive: browser screenshots, rendered-size assertions, local API smokes, simulator screenshots, bundle checks, logs.
- Use user-run or manual steps only for flows the agent cannot ethically or technically drive: production credentials, physical-device feel, paid actions, app-store consoles, user-owned accounts, irreversible writes.
- A manual step must be exact enough to reproduce: device/browser, command or tap path, expected evidence, and where the output/screenshot/log lands.
- If a manual step is the only proof for an item, the item stays unchecked until the user supplies that evidence.

## Failure-mode pairing

Every new cross-boundary success item should usually have a paired failure item. The common bad finish is "the happy path works, then a real 401 logs the user out or leaves a blank screen."

Pair these:

- `2xx success` with `401/403/5xx/timeout graceful degrade`
- `screen renders` with `empty/loading/error states render`
- `nav entry appears` with `deep link / back / refresh works`
- `performance improves` with `no public API or behavior regression`
- `security control allows valid user` with `denies invalid/cross-tenant user`

## Rubric audit command

After writing a draft goal file, run:

```bash
node <goal-skill-dir>/scripts/rubric-audit.mjs .ultragoal/goals/active/<slug>/goal.md
```

Treat `BLOCKER` as a draft defect that must be fixed before asking the user to arm the goal. Treat `WARN` as a deliberate choice: either strengthen the item or record why the weaker check is acceptable in the goal's Context.
