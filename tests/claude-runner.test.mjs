import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const cli = resolve(here, "../installer/cli.mjs");

// Fake claude: -p (fresh) arms an unfinished goal; -p --continue completes it.
// FAKE_CLAUDE_MODE=nogoal   -> never writes a goal file
// FAKE_CLAUDE_MODE=crashfirst -> arms the goal but exits 1 on the fresh -p run
function makeFakeClaude(root) {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const binPath = join(binDir, "claude");
  writeFileSync(
    binPath,
    `#!/bin/sh
printf 'claude %s\\n' "$*" >> "$CALL_LOG"
if [ "$1" = "--version" ]; then
  printf 'claude 9.9.9\\n'
  exit 0
fi
case " $* " in
  *" --continue "*)
    mkdir -p .ultragoal/goals/active/demo
    cat > .ultragoal/goals/active/demo/goal.md <<'EOF'
---
slug: demo
status: done
verify: off
---
# Rubric
- [x] item - check: \`git status\` exits 0
  - evidence: \`git status\` -> clean
# Stop conditions
- done
EOF
    ;;
  *" -p "*)
    if [ "$FAKE_CLAUDE_MODE" = "nogoal" ]; then
      exit 0
    fi
    mkdir -p .ultragoal/goals/active/demo
    cat > .ultragoal/goals/active/demo/goal.md <<'EOF'
---
slug: demo
status: active
verify: off
---
# Rubric
- [ ] item - check: \`git status\` exits 0
# Stop conditions
- done
EOF
    if [ "$FAKE_CLAUDE_MODE" = "crashfirst" ]; then
      exit 1
    fi
    ;;
esac
exit 0
`
  );
  chmodSync(binPath, 0o755);
  return binDir;
}

function runHeadless(mode, extraEnv = {}) {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-claude-run-"));
  const binDir = makeFakeClaude(root);
  const callLog = join(root, "calls.log");
  const result = spawnSync(process.execPath, [cli, "run", "--headless", "finish demo"], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      CALL_LOG: callLog,
      HOME: join(root, "home"),
      NO_COLOR: "1",
      ULTRAGOAL_RUNNER_MAX_TURNS: "3",
      FAKE_CLAUDE_MODE: mode,
      ...extraEnv,
    },
    encoding: "utf8",
  });
  let calls = [];
  try {
    calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  } catch {
    // no calls recorded
  }
  let goal = "";
  try {
    goal = readFileSync(join(root, ".ultragoal/goals/active/demo/goal.md"), "utf8");
  } catch {
    // no goal written
  }
  rmSync(root, { recursive: true, force: true });
  return { result, calls, goal };
}

test("run --headless resumes with --continue until the goal file proves done, then exits 0", () => {
  const { result, calls, goal } = runHeadless("");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(calls.some((line) => line.includes(" -p /ultragoal:goal finish demo") && line.includes("--dangerously-skip-permissions")));
  assert.ok(calls.some((line) => line.includes(" -p --continue ")));
  assert.match(goal, /^status: done$/m);
});

test("run --headless refuses success when Claude creates no goal file", () => {
  const { result } = runHeadless("nogoal");
  assert.equal(result.status, 1);
  assert.match(result.stdout + result.stderr, /did not find a goal file/);
});

test("run --headless survives a crashed first run and resumes against the armed goal", () => {
  const { result, calls, goal } = runHeadless("crashfirst");
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.ok(calls.some((line) => line.includes(" -p --continue ")));
  assert.match(goal, /^status: done$/m);
});

test("run --headless resume prompt carries the remaining rubric work", () => {
  const { calls } = runHeadless("");
  const resume = calls.find((line) => line.includes(" -p --continue "));
  assert.ok(resume, "expected a --continue call");
  assert.match(resume, /Remaining unchecked rubric items|Continue Ultragoal/);
});
