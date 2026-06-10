# Frontend design quality

Use when: the deliverable is a UI that must look and feel genuinely designed — pages, components, landing sites.
Kind: task

## Skills to pair
If available in this session (find more on skills.sh): `frontend-design` (Anthropic's anti-"AI slop" skill), `web-design-guidelines` / Vercel's web-interface-guidelines audit, `ui-ux-pro-max` — use them during design, and run an audit pass before the verifier.

## Rubric
- [ ] No horizontal overflow at standard breakpoints — check: Playwright at 360/768/1280/1920px viewports, `document.documentElement.scrollWidth <= clientWidth` true at each
- [ ] Visual regression baseline holds — check: `npx playwright test` with `toHaveScreenshot({ maxDiffPixelRatio: 0.01 })` per viewport
- [ ] No layout shift — check: Lighthouse CLS ≤ 0.1 (`npx lighthouse <url> --output=json` → `cumulative-layout-shift` audit)
- [ ] No FOIT / font loading handled — check: Lighthouse `font-display` audit score = 1 (use `next/font` or `font-display: swap`)
- [ ] Dark mode renders correctly — check: Playwright `test.use({ colorScheme: 'dark' })` + screenshot assertion
- [ ] Interaction states defined (hover/active/disabled/focus-visible); hit targets ≥ 24×24 CSS px (WCAG 2.5.8) — check: Playwright `:focus-visible` style assertions + target-size audit
- [ ] Spacing/type restricted to the design-token scale — check: `npx stylelint "**/*.css"` with `declaration-property-value-allowed-list`, or Tailwind-config-only values
- [ ] Aesthetic distinctiveness — check: MANUAL — judge against Anthropic's frontend-aesthetics guidance: no default fonts (Inter/Roboto/Arial), no generic purple-gradient-on-white, an intentional aesthetic direction named in one sentence
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or visual-regression baseline churn exceeds 2 update cycles without converging

## Constraints
- No unrelated component restyled — check: `git diff --stat main` confined to the feature's components/styles

## Sources
- https://vercel.com/design/guidelines (repo: vercel-labs/web-interface-guidelines)
- https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
- https://playwright.dev/docs/test-snapshots
