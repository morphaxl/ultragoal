# API endpoint quality

Use when: building or hardening HTTP API endpoints — REST/route handlers with a contract.
Kind: task

## Skills to pair
If available in this session: `vercel-react-best-practices` (route-handler patterns for Next.js APIs). Find more via `find-skills` on skills.sh.

## Rubric
- [ ] Spec conformance: no 5xx on generated inputs, responses match the OpenAPI schema — check: `uvx schemathesis run <openapi-url> --checks all --max-examples 200` exits 0 (prefer schemathesis; dredd is dormant)
- [ ] Input validated at the boundary: malformed input → 400, never 500 — check: schemathesis negative tests above + handlers import a validation schema (zod/valibot) before use
- [ ] Errors use one consistent shape: RFC 9457 Problem Details (`application/problem+json`) — check: integration tests assert content-type and type/title/status/detail on each error path
- [ ] Latency SLO held (set per endpoint; e.g. p95 < 300ms reads) — check: `k6 run load.js` with `thresholds: { http_req_duration: ['p(95)<300'] }` exits 0
- [ ] Unsafe POSTs are retry-safe via Idempotency-Key — check: two identical `curl -X POST -H "Idempotency-Key: $UUID"` calls create exactly one resource
- [ ] Object-level authorization (BOLA — OWASP API #1): cross-tenant access → 403/404 — check: integration tests with two users' tokens against each other's resources; ownership logic itself is MANUAL review
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- Budget reached, or the contract needs a breaking change the spec didn't authorize

## Constraints
- Public API shape unchanged unless the objective says otherwise — check: OpenAPI diff (`npx oasdiff breaking old.yaml new.yaml`) is empty

## Sources
- https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- https://opensource.zalando.com/restful-api-guidelines/
- https://schemathesis.readthedocs.io/en/stable/
