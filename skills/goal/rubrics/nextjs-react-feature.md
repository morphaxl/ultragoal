# Next.js / React feature

Use when: building or changing a feature in a Next.js or React app — success is "exists and works".
Kind: task

When the feature adds or moves a page/route/nav entry, spec it with a **"What you'll see" block first** (nav/layout map + screen inventory + ASCII wireframe + flow + stated assumptions — see the goal skill's Phase 4), and have the user confirm the picture before building — *where* a feature is reached from (nav bar, menu, header) is the decision most often lost to prose.

## Skills to pair
If available in this session (find more on skills.sh): `vercel-react-best-practices`, `vercel-composition-patterns` — apply them *while* building, not as a cleanup pass.

## Rubric
- [ ] Typecheck passes — check: `npx tsc --noEmit` exits 0
- [ ] Lint passes — check: `npx eslint .` exits 0 (Next.js 16 removed `next lint`; `next build` no longer lints — run it explicitly)
- [ ] Unit/integration tests pass and cover the feature's main paths — check: `npx vitest run` (or `npx jest --ci`) exits 0; new test files exist in the diff
- [ ] Production build succeeds — check: `npx next build` exits 0 (also catches client-hooks-in-server-components)
- [ ] No hydration errors on touched routes — check: Playwright against `next build && next start`, collecting `page.on('console')` + `page.on('pageerror')`, zero matches for `/hydrat(ion|e)/i` or React errors #418/#423/#425
- [ ] Touched UI renders its key elements visibly — check: Playwright loads the route and asserts the change's target element is visible with a non-zero box (`await expect(page.getByTestId('...')).toBeVisible()` plus a `boundingBox()` with width/height > 0) — present-in-DOM is not the same as rendered; this catches collapsed/0-height/clipped containers that the build and hydration checks pass
- [ ] New or moved pages are reachable where the user expects — check: for any added/relocated route, assert its entry point (nav link, menu item, header action) is present and visible in the rendered layout — Playwright finds the link in the nav and clicking it lands on the route; a page that only resolves by typing the URL passes a render check while being undiscoverable. Placement must match the spec's "What you'll see" block.
- [ ] New external/API calls succeed against the REAL dependency, not just mocks — check: a live smoke hits the actual (staging) service/route and returns a 2xx with the expected shape, exercising auth/headers/handshake end to end. Mocked tests prove orchestration, never that the dependency accepts the call; live-test the least-certain seam EARLY. A self-disclosed "won't run until the secret/env is set" stays an unchecked blocking item.
- [ ] Routes degrade gracefully on upstream failure — check: force the new call to 4xx/5xx and confirm the UI shows a clear error and the app stays usable — no global logout, no unhandled rejection, no white screen. Tests how the failure cascades, not just the happy path.
- [ ] Server/client boundary respected — check: server-only modules import the `server-only` package (build fails if client-imported); `grep -r "NEXT_PUBLIC_" .env*` reviewed for secret leaks
- [ ] Error and loading states exist for new route segments — check: `find app -name "error.tsx"` and `find app -name "loading.tsx"` (or `<Suspense>`) cover every async segment touched
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or the same item fails verification 3 consecutive times, or the feature requires a public-API change the spec didn't authorize

## Constraints
- No other route's tests or snapshots modified — check: `git diff --stat main -- 'app/**'` confined to the feature's segments

## Sources
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/docs/messages/react-hydration-error
- https://react.dev/reference/react-dom/client/hydrateRoot
