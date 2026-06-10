# Accessibility (WCAG 2.2 AA)

Use when: making a site/app accessible or auditing it — target is WCAG 2.2 AA (current W3C Recommendation; note the six new criteria over 2.1, incl. Target Size 2.5.8 ≥24×24px).
Kind: task

## Skills to pair
If available in this session: `web-design-guidelines` (accessibility rules subset). Find more on skills.sh.

## Rubric
- [ ] Zero axe-core violations at AA — check: `npx @axe-core/cli <url> --tags wcag2a,wcag2aa,wcag21aa,wcag22aa --exit` exits 0 (automation catches ~57% of issue volume — the rest is the manual items below)
- [ ] Zero pa11y errors — check: `npx pa11y <url> --standard WCAG2AA --runner axe --runner htmlcs`; multi-page via `pa11y-ci --sitemap`
- [ ] Lighthouse accessibility ≥ 0.95 — check: `npx lighthouse <url> --only-categories=accessibility --output=json`
- [ ] Contrast: 4.5:1 normal text, 3:1 large text/UI (1.4.3, 1.4.11) — check: `npx @axe-core/cli <url> --rules color-contrast --exit`
- [ ] Every interactive element keyboard-reachable with visible focus — check: Playwright Tab-walk asserting `document.activeElement` progression and `:focus-visible` styles
- [ ] Focus order is logical; alt text is *meaningful*; error messages help recovery — check: MANUAL — human walks the changed flows; automated tools cannot judge these
- [ ] Screen-reader pass on the core flow — check: MANUAL — VoiceOver (macOS/iOS) or NVDA (Windows) walkthrough of the primary user journey, notes appended to the goal file
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or a violation requires a third-party component the project can't change (record it as a known issue instead)

## Constraints
- No `aria-*` attributes added to suppress tooling without fixing the underlying issue — check: diff review of added aria attributes with justification per use

## Sources
- https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/
- https://github.com/pa11y/pa11y
- https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/
