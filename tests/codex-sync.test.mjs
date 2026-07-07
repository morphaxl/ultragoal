import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

// The Codex plugin ships standalone copies of files whose canonical home is the
// Claude side (it cannot import across plugin boundaries). Copies drift silently
// without this guard: edit the canonical file, then copy it over the Codex one.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const PAIRS = [
  ["scripts/rubric-audit.mjs", "plugins/ultragoal-codex/skills/ultragoal-goal/scripts/rubric-audit.mjs"],
  ["skills/goal/rubric-guide.md", "plugins/ultragoal-codex/skills/ultragoal-goal/references/rubric-guide.md"],
  ["skills/goal/qa-capability-map.md", "plugins/ultragoal-codex/skills/ultragoal-goal/references/qa-capability-map.md"],
];

for (const [canonical, copy] of PAIRS) {
  test(`codex copy is byte-identical to its canonical source: ${copy}`, () => {
    assert.equal(
      readFileSync(resolve(root, copy), "utf8"),
      readFileSync(resolve(root, canonical), "utf8"),
      `${copy} drifted from ${canonical} — update the canonical file and copy it over the Codex one.`
    );
  });
}
