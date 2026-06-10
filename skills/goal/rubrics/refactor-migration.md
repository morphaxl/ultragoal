# Refactor / migration

Use when: restructuring code or migrating APIs/frameworks — behavior must be provably preserved (Fowler: "without changing its observable behavior").
Kind: task

## Skills to pair
`vercel-composition-patterns` for React component restructuring, if available. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Behavior preserved: full suite green before AND after; test assertions unmodified — check: `git diff main... -- '**/*.test.*'` empty or rename-only, suite exits 0
- [ ] Coverage not reduced — check: `npx jest --coverage --coverageThreshold='{"global":{"lines":<pre-refactor baseline>}}'` (or `coverage report --fail-under=<baseline>`)
- [ ] Every commit is a working state (Google LSC: no big-bang) — check: `git rebase --exec '<test cmd>' main` exits 0
- [ ] Codemods are idempotent — check: run the codemod twice; second run `git diff --exit-code` is clean
- [ ] No dead code left behind — check: `npx knip` exits clean (ts-prune is unmaintained — use knip) / `vulture src/ --min-confidence 80`
- [ ] Consumers still compatible: zero references to removed/renamed symbols — check: `grep -rn '<oldName>' --include='*.ts*'` returns nothing; public packages: `npx @arethetypeswrong/cli`
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or behavior-preservation requires fixing a latent bug first (split it out as its own bug-fix goal)

## Constraints
- No feature changes smuggled in — the observable behavior diff must be empty by definition

## Sources
- https://refactoring.com/
- https://abseil.io/resources/swe-book/html/ch22.html (Large-Scale Changes)
- https://knip.dev/explanations/comparison-and-migration
