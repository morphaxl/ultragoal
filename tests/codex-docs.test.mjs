import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Codex skill no longer claims to be only a native-goal bridge", () => {
  const skill = text("../plugins/ultragoal-codex/skills/ultragoal-goal/SKILL.md");
  assert.match(skill, /Codex Stop hook/i);
  assert.match(skill, /verify: panel/i);
  assert.match(skill, /hook trust/i);
  assert.doesNotMatch(skill, /Do not install or require Claude-only hooks/);
  assert.doesNotMatch(skill, /This is a Codex bridge, not the Claude hook-gated loop/);
});

test("README and DESIGN document Codex hooks, runner, panel mode, and fallback", () => {
  const docs = `${text("../README.md")}\n${text("../DESIGN.md")}`;
  assert.match(docs, /npx ultragoal run --codex/);
  assert.match(docs, /Codex Stop hook/i);
  assert.match(docs, /hook trust/i);
  assert.match(docs, /panel/i);
  assert.match(docs, /fallback/i);
});

test("README documents Codex interview mode and headless defaulting", () => {
  const docs = text("../README.md");
  assert.match(docs, /Codex interactive/i);
  assert.match(docs, /interview/i);
  assert.match(docs, /recap/i);
  assert.match(docs, /Arm goal/i);
  assert.match(docs, /Headless Codex/i);
  assert.match(docs, /does not ask/i);
  assert.match(docs, /records? defaults/i);
});

test("CLI help documents Codex run usage", () => {
  const res = spawnSync(process.execPath, [fileURLToPath(new URL("../installer/cli.mjs", import.meta.url)), "--help"], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
  assert.equal(res.status, 0, res.stderr || res.stdout);
  assert.match(res.stdout, /npx ultragoal run --codex/);
  assert.match(res.stdout, /Codex/);
  assert.match(res.stdout, /--headless/);
  assert.match(res.stdout, /interactive interview/i);
  assert.match(res.stdout, /records defaults/i);
});
