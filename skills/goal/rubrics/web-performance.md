# Web performance

Use when: making a site/app faster against Core Web Vitals or bundle budgets — a number must improve.
Kind: experiment (use the measure-and-ratchet loop; the Lighthouse/size-limit command is the immutable measure)

## Skills to pair
If available in this session: `vercel-react-best-practices` (rendering/bundle patterns). Find more on skills.sh.

## Rubric
- [ ] Baseline recorded as results.tsv row 1 with run-to-run variance noted — check: `head -2 .ultragoal/goals/results.tsv`
- [ ] LCP ≤ 2.5s at p75 (official "good"; ignore blog claims of 2.0s — web.dev says 2.5) — check: lab proxy `npx lighthouse <url> --output=json --quiet`; field: web-vitals `onLCP` or CrUX API
- [ ] INP ≤ 200ms at p75 (INP replaced FID, stable since 2024) — check: field `web-vitals` `onINP`; lab proxy = Lighthouse TBT trend
- [ ] CLS ≤ 0.1 at p75 — check: `npx lighthouse <url> --output=json` → `jq '.audits["cumulative-layout-shift"].numericValue'`
- [ ] Lighthouse performance ≥ 0.90 — check: `npx @lhci/cli autorun` with assertion `'categories:performance': ['error', {minScore: 0.9}]` (asserts on median of 3 runs)
- [ ] First Load JS within budget (~200 kB gzipped is common practice, set per project) — check: `npx size-limit` exits 0; baseline from `next build` output
- [ ] All experiments journaled with commit hashes, including discards — check: `cat .ultragoal/goals/results.tsv`
- [ ] Measure commands and their inputs unmodified since baseline — check: `git diff <baseline-commit> -- lighthouserc.* .size-limit.*` is empty
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Experiment budget reached, target met, or 5 consecutive discards after a plateau-break attempt

## Constraints
- p75 claims need field data or are labeled lab-proxy; never compare runs across different hardware/network throttling profiles

## Sources
- https://web.dev/articles/vitals
- https://web.dev/articles/lighthouse-ci
- https://github.com/ai/size-limit
