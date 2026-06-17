import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const exists = (path) => existsSync(new URL(path, import.meta.url));

test("Codex plugin bundles default lifecycle hooks and referenced scripts", () => {
  const hooks = json("../plugins/ultragoal-codex/hooks/hooks.json");
  const plugin = json("../plugins/ultragoal-codex/.codex-plugin/plugin.json");

  assert.equal(plugin.name, "ultragoal-codex");
  assert.ok(hooks.hooks.Stop);
  assert.ok(hooks.hooks.SessionStart);

  const stopCommand = hooks.hooks.Stop[0].hooks[0].command;
  const sessionCommand = hooks.hooks.SessionStart[0].hooks[0].command;
  assert.match(stopCommand, /codex-goal-gate\.sh/);
  assert.match(sessionCommand, /codex-session-context\.sh/);
  assert.match(stopCommand, /plugins\/cache/);
  assert.match(stopCommand, /plugins\/ultragoal-codex\/scripts/);

  assert.equal(exists("../plugins/ultragoal-codex/scripts/codex-goal-gate.sh"), true);
  assert.equal(exists("../plugins/ultragoal-codex/scripts/codex-session-context.sh"), true);
  assert.match(text("../plugins/ultragoal-codex/scripts/codex-goal-gate.sh"), /FAIL OPEN/);
});

test("Codex plugin metadata describes hook-backed loop capability", () => {
  const plugin = json("../plugins/ultragoal-codex/.codex-plugin/plugin.json");
  const combined = JSON.stringify(plugin);

  assert.match(combined, /hooks/i);
  assert.match(combined, /Goal/i);
  assert.equal(plugin.version, json("../package.json").version);
});
