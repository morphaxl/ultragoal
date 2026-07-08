import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../installer/cli.mjs");

function invariant(fields) {
  return `slug: ${fields.slug}\nborn: 2026-07-01\nsource: goal ${fields.slug}\nstatus: ${fields.status || "satisfied"}\nlast-pass: 2026-07-01\non-violation: ${fields.onViolation || "report — do not auto-fix"}\npredicate: ${fields.predicate}\n`;
}

function run(root) {
  return spawnSync(process.execPath, [cli, "invariants"], {
    cwd: root,
    env: { ...process.env, NO_COLOR: "1" },
    encoding: "utf8",
  });
}

test("invariants: violation flips status, appends ledger, exits 1 with on-violation policy", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-inv-"));
  const dir = join(root, ".ultragoal", "invariants");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "holds.md"), invariant({ slug: "holds", predicate: "true" }));
  writeFileSync(join(dir, "broken.md"), invariant({ slug: "broken", predicate: "false", onViolation: "wake me" }));
  writeFileSync(join(dir, "old.md"), invariant({ slug: "old", status: "retired", predicate: "false" }));

  const res = run(root);
  const holds = readFileSync(join(dir, "holds.md"), "utf8");
  const broken = readFileSync(join(dir, "broken.md"), "utf8");
  const ledger = readFileSync(join(dir, ".ledger.tsv"), "utf8").trim().split("\n");
  rmSync(root, { recursive: true, force: true });

  assert.equal(res.status, 1);
  assert.match(res.stderr, /INVARIANTS VIOLATED \(1 of 2\)/);
  assert.match(res.stderr, /broken — on-violation: wake me/);
  assert.match(res.stderr, /new goal/);
  assert.match(holds, /^status: satisfied$/m);
  assert.match(holds, /^last-pass: 20\d\d-\d\d-\d\d$/m);
  assert.doesNotMatch(holds, /last-pass: 2026-07-01/);
  assert.match(broken, /^status: VIOLATED$/m);
  assert.equal(ledger.length, 2, "retired invariant produces no ledger row");
  assert.ok(ledger.some((l) => l.includes("\tholds\tpass\t")));
  assert.ok(ledger.some((l) => l.includes("\tbroken\tFAIL\t")));
});

test("invariants: all passing exits 0 and reports the count", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-inv-ok-"));
  const dir = join(root, ".ultragoal", "invariants");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "a.md"), invariant({ slug: "a", predicate: "true" }));
  writeFileSync(join(dir, "b.md"), invariant({ slug: "b", status: "VIOLATED", predicate: "true" }));

  const res = run(root);
  const b = readFileSync(join(dir, "b.md"), "utf8");
  rmSync(root, { recursive: true, force: true });

  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /All 2 standing invariant\(s\) hold/);
  assert.match(b, /^status: satisfied$/m, "recovered invariant flips back to satisfied");
});

test("invariants: no directory is a clean no-op", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-inv-none-"));
  mkdirSync(join(root, ".ultragoal"), { recursive: true });
  const res = run(root);
  rmSync(root, { recursive: true, force: true });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /No .ultragoal\/invariants\//);
});
