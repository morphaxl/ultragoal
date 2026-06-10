# Dependency upgrade

Use when: upgrading packages — majors, framework bumps, or routine batches — without breakage or supply-chain risk.
Kind: task

## Skills to pair
Framework migration skills if the bump is a framework major. Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Diff is manifest + lockfile only — check: `git diff --name-only main... | grep -vE '(package\.json|package-lock\.json|pnpm-lock\.yaml|poetry\.lock|uv\.lock|requirements.*\.txt)$'` is empty (code changes belong in their own commits, justified per major)
- [ ] Lockfile reproducible, no phantom drift — check: `npm ci` / `pnpm install --frozen-lockfile` exits 0; `npm install --package-lock-only && git diff --exit-code package-lock.json`
- [ ] Breaking changes audited: each major's changelog read, findings noted in the goal's Decision journal — check: journal lists every major bump with its breaking-change notes
- [ ] Vulnerability-clean post-upgrade — check: `npm audit --audit-level=high` and `osv-scanner scan -L <lockfile>` exit 0 (OpenSSF: use both)
- [ ] Registry integrity — check: `npx lockfile-lint --path <lockfile> --allowed-hosts npm --validate-https` exits 0
- [ ] Fresh-release cooldown honored (supply-chain guidance post-Shai-Hulud: avoid versions published in the last few days) — check: `npm view <pkg> time --json` publish dates reviewed
- [ ] Runtime smoke passes — tests alone miss runtime-only breakage — check: `npm ci && <test cmd> && <boot/smoke cmd>` exits 0
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or a major requires app-code migration beyond mechanical changes (split into its own refactor-migration goal)

## Constraints
- No `--force`/`--legacy-peer-deps` without a written justification in the Decision journal

## Sources
- https://github.com/ossf/package-manager-best-practices/blob/main/published/npm.md
- https://google.github.io/osv-scanner/usage/
- https://docs.npmjs.com/cli/commands/npm-ci
