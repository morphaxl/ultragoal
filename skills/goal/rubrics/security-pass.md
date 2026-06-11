# Auth / security pass

Use when: hardening a web app's security or auditing auth — target is the automatable subset of OWASP ASVS 5.0 Level 2 (the right level for apps handling personal data) plus OWASP Top 10:2025 awareness.
Kind: task

Model note (Claude Fable 5): its safety classifiers target offensive cybersecurity and can false-positive on benign hardening work — a turn can end in a refusal mid-goal. Keep the goal framed defensively (audit, harden, fix — never exploit-building or PoC crafting), lean on standard tool runs (semgrep, osv-scanner, gitleaks) for the adversarial-flavored checks, and if refusals persist, run this goal on Claude Opus 4.8.

## Skills to pair
Security review skills if present (e.g. Claude Code's built-in `security-review`). Find more via `find-skills` on skills.sh.

## Rubric
- [ ] No high/critical known-vulnerable dependencies (A03:2025 Software Supply Chain) — check: `npm audit --audit-level=high` and `osv-scanner scan source -r .` both exit 0
- [ ] No ERROR-severity SAST findings for auth/injection — check: `semgrep scan --config p/owasp-top-ten --config p/jwt --severity ERROR --error` exits 0
- [ ] No secrets in repo or history — check: `gitleaks git .` exits 0 (v8.19+ syntax; `detect` is deprecated)
- [ ] Security headers at Observatory grade ≥ B+ — check: `npx @mdn/mdn-http-observatory <domain>` score ≥ 70; HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy each present via `curl -sI`
- [ ] Session cookies `HttpOnly; Secure; SameSite`; login rate-limited; no user enumeration — check: `curl -sI` Set-Cookie assertions + rate-limit integration test (N rapid attempts → 429)
- [ ] Authorization logic and threat model reviewed against ASVS L2 — check: MANUAL — human review; access-control correctness (A01:2025) is not automatable
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or a finding requires infrastructure changes outside the repo (record as known issue with severity)

## Constraints
- No security tooling suppressed inline (`nosemgrep`, audit exceptions) without a written justification in the diff

## Sources
- https://owasp.org/Top10/2025/
- https://owasp.org/www-project-application-security-verification-standard/ (ASVS 5.0)
- https://github.com/gitleaks/gitleaks
