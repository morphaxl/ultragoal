import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const text = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Codex skill defines an interactive interview protocol before arming", () => {
  const skill = text("../plugins/ultragoal-codex/skills/ultragoal-goal/SKILL.md");

  assert.match(skill, /interactive interview mode/i);
  assert.match(skill, /consult.*memory/i);
  assert.match(skill, /repo/i);
  assert.match(skill, /ambiguity.*stakes.*run length/i);
  assert.match(skill, /decision-shaped questions/i);
  assert.match(skill, /recommended default/i);
  assert.match(skill, /Recap before arming/i);
  assert.match(skill, /standalone.*Arm goal/i);
  assert.match(skill, /wait for.*explicit/i);
});

test("Codex skill defines autonomous defaults for headless mode", () => {
  const skill = text("../plugins/ultragoal-codex/skills/ultragoal-goal/SKILL.md");

  assert.match(skill, /headless.*autonomous/i);
  assert.match(skill, /do not ask.*user/i);
  assert.match(skill, /record.*defaults/i);
  assert.match(skill, /status: active/i);
  assert.match(skill, /codex_goal: active/i);
});
