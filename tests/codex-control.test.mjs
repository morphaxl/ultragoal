import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repo = resolve(new URL("..", import.meta.url).pathname);
const bootstrap = join(repo, "plugins/ultragoal-codex/scripts/codex-agent-bootstrap.sh");
const evidenceGate = join(repo, "plugins/ultragoal-codex/scripts/codex-executor-evidence-gate.sh");

function sh(script, { cwd, env = {}, input = "" } = {}) {
  return spawnSync("sh", [script], {
    cwd,
    input,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("Codex agent bootstrap links bundled Ultragoal custom agents", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-bootstrap-"));
  try {
    const codexHome = join(root, "codex-home");
    const result = sh(bootstrap, { cwd: root, env: { CODEX_HOME: codexHome } });

    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(codexHome, "agents/ultragoal-executor.toml")));
    assert.ok(existsSync(join(codexHome, "agents/ultragoal-verifier.toml")));
    assert.match(readFileSync(join(codexHome, "agents/ultragoal-executor.toml"), "utf8"), /ULTRAGOAL_EVIDENCE_RECORDED/);
    assert.match(result.stdout, /custom agents linked/i);

    const second = sh(bootstrap, { cwd: root, env: { CODEX_HOME: codexHome } });
    assert.equal(second.status, 0, second.stderr);
    assert.equal(second.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ultragoal-executor SubagentStop gate blocks missing evidence receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-evidence-missing-"));
  try {
    mkdirSync(join(root, ".ultragoal"), { recursive: true });
    const payload = JSON.stringify({
      hook_event_name: "SubagentStop",
      agent_type: "ultragoal-executor",
      agent_id: "agent-1",
      session_id: "session-1",
      cwd: root,
      last_assistant_message: "Done.",
    });

    const result = sh(evidenceGate, { cwd: root, input: payload });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"decision":"block"/);
    assert.match(result.stdout, /ULTRAGOAL_EVIDENCE_RECORDED/);
    assert.ok(existsSync(join(root, ".ultragoal/.executor-gate/session-1.agent-1.attempts")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ultragoal-executor SubagentStop gate accepts non-empty evidence receipt under .ultragoal/evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-evidence-valid-"));
  try {
    mkdirSync(join(root, ".ultragoal/evidence"), { recursive: true });
    writeFileSync(join(root, ".ultragoal/evidence/run.md"), "command: npm test\nresult: pass\n");
    const payload = JSON.stringify({
      hook_event_name: "SubagentStop",
      agent_type: "ultragoal-executor",
      agent_id: "agent-1",
      session_id: "session-1",
      cwd: root,
      last_assistant_message: "Done.\nULTRAGOAL_EVIDENCE_RECORDED: .ultragoal/evidence/run.md",
    });

    const result = sh(evidenceGate, { cwd: root, input: payload });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("ultragoal-executor SubagentStop gate rejects receipts outside .ultragoal/evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-codex-evidence-outside-"));
  try {
    mkdirSync(join(root, ".ultragoal/evidence"), { recursive: true });
    writeFileSync(join(root, "outside.md"), "not acceptable\n");
    const payload = JSON.stringify({
      hook_event_name: "SubagentStop",
      agent_type: "ultragoal-executor",
      agent_id: "agent-1",
      session_id: "session-1",
      cwd: root,
      last_assistant_message: "Done.\nULTRAGOAL_EVIDENCE_RECORDED: outside.md",
    });

    const result = sh(evidenceGate, { cwd: root, input: payload });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"decision":"block"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
