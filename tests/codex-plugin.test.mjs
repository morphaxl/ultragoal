import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { auditRubric } from "../plugins/ultragoal-codex/skills/ultragoal-goal/scripts/rubric-audit.mjs";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Codex plugin metadata is installable and version-aligned", () => {
  const pkg = json("../package.json");
  const claudePlugin = json("../.claude-plugin/plugin.json");
  const codexPlugin = json("../plugins/ultragoal-codex/.codex-plugin/plugin.json");
  const marketplace = json("../.agents/plugins/marketplace.json");

  assert.equal(codexPlugin.name, "ultragoal-codex");
  assert.equal(codexPlugin.version, pkg.version);
  assert.equal(claudePlugin.version, pkg.version);
  assert.equal(codexPlugin.skills, "./skills/");

  const entry = marketplace.plugins.find((plugin) => plugin.name === "ultragoal-codex");
  assert.ok(entry);
  assert.deepEqual(entry.source, { source: "local", path: "./plugins/ultragoal-codex" });
  assert.equal(entry.policy.installation, "AVAILABLE");
  assert.equal(entry.policy.authentication, "ON_INSTALL");
});

test("Codex ultragoal skill targets native goal mode", () => {
  const skill = text("../plugins/ultragoal-codex/skills/ultragoal-goal/SKILL.md");

  assert.match(skill, /^name: ultragoal-goal$/m);
  assert.match(skill, /create_goal/);
  assert.match(skill, /\/goal Work from/);
  assert.match(skill, /rubric-audit\.mjs/);
  assert.match(skill, /Codex native Goal mode is the persistence layer/);
});

test("Codex-bundled rubric audit works independently", () => {
  const result = auditRubric(`
# Objective
Ship native-goal bridge.

# Rubric
- [ ] Draft file is written - check: \`test -f .ultragoal/codex-goals/demo/goal.md\` exits 0
- [ ] Browser page renders visibly - check: BROWSER - open http://localhost:3000/demo and capture screenshot evidence with a non-zero bounding box
- [ ] VERIFIER: independent sign-off recorded in the Verification log

# Stop conditions
- 25 turns reached

# Constraints
- No Claude hook dependency - check: \`bash -lc '! rg -n "CLAUDE_PLUGIN_ROOT" plugins/ultragoal-codex'\` exits 0
`);

  assert.equal(result.status, "PASS");
  assert.deepEqual(result.issues.filter((issue) => issue.severity === "BLOCKER"), []);
});
