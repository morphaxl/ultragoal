import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../installer/cli.mjs");

function makeFakeBin(root, name) {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const binPath = join(binDir, name);
  writeFileSync(
    binPath,
    `#!/bin/sh
name=$(basename "$0")
printf '%s %s\\n' "$name" "$*" >> "$CALL_LOG"
if [ "$1" = "--version" ]; then printf '%s 9.9.9\\n' "$name"; fi
exit 0
`
  );
  chmodSync(binPath, 0o755);
  return binDir;
}

function makeLoopingFakeCodex(root) {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const binPath = join(binDir, "codex");
  writeFileSync(
    binPath,
    `#!/bin/sh
printf 'codex %s\\n' "$*" >> "$CALL_LOG"
if [ "$1" = "--version" ]; then
  printf 'codex 9.9.9\\n'
  exit 0
fi
case " $* " in
  *" exec resume "*)
    mkdir -p .ultragoal/codex-goals/demo
    cat > .ultragoal/codex-goals/demo/goal.md <<'EOF'
---
slug: demo
status: done
codex_goal: active
verify: off
---
# Rubric
- [x] item - check: \`true\` exits 0
  - evidence: \`true\` -> ok
# Stop conditions
- done
EOF
    ;;
  *" exec "*)
    mkdir -p .ultragoal/codex-goals/demo
    cat > .ultragoal/codex-goals/demo/goal.md <<'EOF'
---
slug: demo
status: active
codex_goal: active
verify: off
---
# Rubric
- [ ] item - check: \`true\` exits 0
# Stop conditions
- done
EOF
    ;;
esac
exit 0
`
  );
  chmodSync(binPath, 0o755);
  return binDir;
}

function run(args) {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-run-"));
  const binDir = makeFakeBin(root, "codex");
  makeFakeBin(root, "claude");
  const callLog = join(root, "calls.log");
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      CALL_LOG: callLog,
      HOME: join(root, "home"),
      NO_COLOR: "1",
    },
    encoding: "utf8",
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  rmSync(root, { recursive: true, force: true });
  return { result, calls };
}

test("run --codex --headless installs plugin and launches codex exec with hook trust bypass", () => {
  const { result, calls } = run(["run", "--codex", "--headless", "make chat fast"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex plugin marketplace add morphaxl/ultragoal",
    "codex plugin add ultragoal-codex@morphaxl",
    "codex --sandbox workspace-write --ask-for-approval never --dangerously-bypass-hook-trust exec $ultragoal-goal make chat fast",
  ]);
});

test("run --codex --safe uses interactive Codex with approval guardrails", () => {
  const { result, calls } = run(["run", "--codex", "--safe", "ship report"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex plugin marketplace add morphaxl/ultragoal",
    "codex plugin add ultragoal-codex@morphaxl",
    "codex --sandbox workspace-write --ask-for-approval on-request $ultragoal-goal ship report",
  ]);
});

test("run --codex --headless resumes while an active goal remains incomplete", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-loop-"));
  const binDir = makeLoopingFakeCodex(root);
  makeFakeBin(root, "claude");
  const callLog = join(root, "calls.log");
  const result = spawnSync(process.execPath, [cli, "run", "--codex", "--headless", "finish demo"], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      CALL_LOG: callLog,
      HOME: join(root, "home"),
      NO_COLOR: "1",
      ULTRAGOAL_CODEX_RUNNER_MAX_TURNS: "3",
    },
    encoding: "utf8",
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  const goal = readFileSync(join(root, ".ultragoal/codex-goals/demo/goal.md"), "utf8");
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(calls.some((line) => line.includes(" exec $ultragoal-goal finish demo")));
  assert.ok(calls.some((line) => line.includes(" exec resume --last ")));
  assert.match(goal, /^status: done$/m);
});
