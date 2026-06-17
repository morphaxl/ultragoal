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
    if [ "$FAKE_CODEX_DONE_BYPASS" = "1" ]; then
      cat > .ultragoal/codex-goals/demo/goal.md <<'EOF'
---
slug: demo
status: done
codex_goal: active
verify: off
---
# Rubric
- [ ] item - check: \`true\` exits 0
# Stop conditions
- done
EOF
      exit 0
    fi
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

function run(args, extraEnv = {}) {
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
      ...extraEnv,
    },
    encoding: "utf8",
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  rmSync(root, { recursive: true, force: true });
  return { result, calls };
}

test("run --codex --headless refuses success when Codex creates no goal file", () => {
  const { result, calls } = run(["run", "--codex", "--headless", "make chat fast"], {
    ULTRAGOAL_CODEX_RUNNER_MAX_TURNS: "1",
  });
  assert.equal(result.status, 1);
  assert.deepEqual(calls, [
    "codex --version",
    "codex --version",
    "codex plugin marketplace add morphaxl/ultragoal",
    "codex plugin add ultragoal-codex@morphaxl",
    "codex --sandbox workspace-write --ask-for-approval never --dangerously-bypass-hook-trust exec $ultragoal-goal MODE: headless-autonomous. Do not ask the user questions. Make and record explicit defaults in the goal file for ambiguity, then arm and execute. Brief: make chat fast",
  ]);
  assert.match(result.stdout + result.stderr, /did not find a goal file/);
});

test("run --codex --safe uses interactive Codex with approval guardrails", () => {
  const { result, calls } = run(["run", "--codex", "--safe", "ship report"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex --version",
    "codex plugin marketplace add morphaxl/ultragoal",
    "codex plugin add ultragoal-codex@morphaxl",
    "codex --sandbox workspace-write --ask-for-approval on-request $ultragoal-goal MODE: interactive-interview. Consult memory and repo context, ask high-leverage questions when ambiguity matters, recap the draft contract, and wait for a standalone Arm goal confirmation before arming. Brief: ship report",
  ]);
});

test("run --codex interactive launches with interview and explicit arm instructions", () => {
  const { result, calls } = run(["run", "--codex", "ship report"]);
  const launch = calls.at(-1);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(launch, /MODE: interactive-interview/);
  assert.match(launch, /Consult memory and repo context/);
  assert.match(launch, /recap the draft contract/);
  assert.match(launch, /standalone Arm goal confirmation/);
});

test("run --codex --headless launches with autonomous default instructions", () => {
  const { result, calls } = run(["run", "--codex", "--headless", "make chat fast"], {
    ULTRAGOAL_CODEX_RUNNER_MAX_TURNS: "1",
  });
  const launch = calls.at(-1);

  assert.equal(result.status, 1);
  assert.match(launch, /MODE: headless-autonomous/);
  assert.match(launch, /Do not ask the user questions/);
  assert.match(launch, /record explicit defaults/);
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
  assert.ok(calls.some((line) => line.includes(" exec $ultragoal-goal MODE: headless-autonomous") && line.includes("Brief: finish demo")));
  assert.ok(calls.some((line) => line.includes(" exec resume --last ")));
  assert.match(goal, /^status: done$/m);
});

test("run --codex --headless does not trust status done until rubric is actually valid", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-done-bypass-"));
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
      FAKE_CODEX_DONE_BYPASS: "1",
    },
    encoding: "utf8",
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  const goal = readFileSync(join(root, ".ultragoal/codex-goals/demo/goal.md"), "utf8");
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(calls.some((line) => line.includes(" exec resume --last ")));
  assert.match(goal, /^status: done$/m);
  assert.match(goal, /- \[x\] item/);
  assert.match(goal, /evidence:/);
});
