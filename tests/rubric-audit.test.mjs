import assert from "node:assert/strict";
import test from "node:test";

import { auditRubric } from "../scripts/rubric-audit.mjs";

test("passes a rubric with browser, live-service, failure, constraints, and verifier checks", () => {
  const result = auditRubric(`
# Objective
Ship checkout.

# Rubric
- [ ] Checkout button is wired to the action — check: \`pnpm typecheck && pnpm vitest run checkout.test.ts\` exits 0
- [ ] Checkout button is visible and clickable in the browser — check: \`pnpm exec playwright test e2e/checkout-visible.spec.ts\` confirms toBeVisible plus non-zero boundingBox and no page errors
- [ ] Checkout API succeeds against Stripe test mode — check: \`node scripts/smoke-checkout.mjs --env staging\` makes one real authenticated request and returns 2xx with a persisted session id
- [ ] Checkout failure degrades safely — check: \`node scripts/smoke-checkout-failure.mjs --status 402\` shows a clear error and no global logout
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached

# Constraints
- No public API shape change — check: \`git diff --stat main -- api\` reviewed
`);

  assert.equal(result.status, "PASS");
  assert.deepEqual(result.issues.filter((issue) => issue.severity === "BLOCKER"), []);
});

test("blocks visual claims that are only proved by static checks", () => {
  const result = auditRubric(`
# Rubric
- [ ] New dashboard screen renders visibly — check: \`pnpm typecheck && pnpm vitest run\` exits 0
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached
`);

  assert.equal(result.status, "FAIL");
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /UI\/runtime claim but only cites static checks/);
});

test("blocks external-boundary claims that are explicitly mock-only", () => {
  const result = auditRubric(`
# Rubric
- [ ] New auth gateway endpoint accepts users — check: \`pnpm vitest run gateway.mock.test.ts\` mocked unit tests pass
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached
`);

  assert.equal(result.status, "FAIL");
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /mock-only/);
});

test("blocks missing verifier, stop conditions, exact commands, and placeholder commands", () => {
  const result = auditRubric(`
# Rubric
- [ ] Thing works — check: \`TODO\`
- [ ] Another thing works
`);

  const messages = result.issues.map((issue) => issue.message).join("\n");
  assert.equal(result.status, "FAIL");
  assert.match(messages, /No # Stop conditions section/);
  assert.match(messages, /placeholder check command/);
  assert.match(messages, /no "check:" command/);
  assert.match(messages, /missing the final "VERIFIER/);
});

test("allows explicit manual and agent-run observation protocols without backticked commands", () => {
  const result = auditRubric(`
# Rubric
- [ ] Gesture tracks the finger on device — check: MANUAL DEVICE STEP — physical iPhone and Android, drag the sheet and confirm it follows the finger without keyboard overlap
- [ ] Feed card renders visibly — check: AGENT-RUN visual smoke — capture a simulator screenshot and confirm the target card has non-zero size
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached

# Constraints
- No warning suppressions — check: \`git diff -- src | grep -v ignoreLogs\` exits 0
`);

  assert.equal(result.status, "PASS");
  assert.deepEqual(result.issues.filter((issue) => issue.severity === "BLOCKER"), []);
});

test("blocks unstructured prose checks without commands", () => {
  const result = auditRubric(`
# Rubric
- [ ] Thing works — check: try it locally and make sure it seems fine
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached
`);

  assert.equal(result.status, "FAIL");
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /no exact backticked command or structured manual/);
});

test("blocks backticked expected values masquerading as commands", () => {
  const result = auditRubric(`
# Rubric
- [ ] Staging checkout succeeds — check: returns \`2xx\` and a session id
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached
`);

  assert.equal(result.status, "FAIL");
  assert.match(result.issues.map((issue) => issue.message).join("\n"), /do not look like an executable command/);
});

test("accepts rubric sections written as nested markdown headings", () => {
  const result = auditRubric(`
# Template

## Rubric
- [ ] Static wiring passes — check: \`pnpm typecheck\` exits 0
- [ ] VERIFIER: independent sign-off recorded in the Verification log

## Stop conditions
- 25 turns reached

## Constraints
- Scope stays local — check: \`git diff --stat main\` reviewed
`);

  assert.equal(result.status, "PASS");
  assert.deepEqual(result.issues.filter((issue) => issue.severity === "BLOCKER"), []);
});
