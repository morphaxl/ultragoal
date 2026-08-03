import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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
if [ "$1" = "--version" ]; then
  printf '%s 9.9.9\\n' "$name"
fi
exit 0
`
  );
  chmodSync(binPath, 0o755);
  return binDir;
}

function makeBrokenCodexBin(root) {
  const binDir = join(root, "broken-bin");
  mkdirSync(binDir, { recursive: true });
  const binPath = join(binDir, "codex");
  writeFileSync(
    binPath,
    `#!/bin/sh
echo 'broken codex wrapper' >&2
exit 1
`
  );
  chmodSync(binPath, 0o755);
  return binDir;
}

function runInstaller(args) {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-installer-"));
  const binDir = makeFakeBin(root, "claude");
  makeFakeBin(root, "codex");
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

test("installer --codex installs only the Codex plugin", () => {
  const { result, calls } = runInstaller(["--yes", "--codex"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex --version",
    "codex plugin marketplace add shamilkayal/ultragoal",
    "codex plugin add ultragoal-codex@shamilkayal",
  ]);
});

test("installer --codex skips a broken earlier Codex wrapper and uses a later working binary", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-installer-"));
  const brokenBin = makeBrokenCodexBin(root);
  const goodBin = makeFakeBin(root, "codex");
  makeFakeBin(root, "claude");
  const callLog = join(root, "calls.log");

  const result = spawnSync(process.execPath, [cli, "--yes", "--codex"], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${brokenBin}:${goodBin}:${process.env.PATH}`,
      CALL_LOG: callLog,
      HOME: join(root, "home"),
      NO_COLOR: "1",
    },
    encoding: "utf8",
  });

  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex --version",
    "codex plugin marketplace add shamilkayal/ultragoal",
    "codex plugin add ultragoal-codex@shamilkayal",
  ]);
});

test("installer --claude keeps the existing Claude project default", () => {
  const { result, calls } = runInstaller(["--yes", "--claude"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "claude --version",
    "claude plugin marketplace add shamilkayal/ultragoal",
    "claude plugin install ultragoal@ultragoal --scope project",
  ]);
});

test("installer --all installs Claude and Codex with the requested Claude scope", () => {
  const { result, calls } = runInstaller(["--yes", "--all", "--global"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "claude --version",
    "claude plugin marketplace add shamilkayal/ultragoal",
    "claude plugin install ultragoal@ultragoal --scope user",
    "codex --version",
    "codex --version",
    "codex plugin marketplace add shamilkayal/ultragoal",
    "codex plugin add ultragoal-codex@shamilkayal",
  ]);
});

test("uninstall --codex removes only the Codex plugin and marketplace", () => {
  const { result, calls } = runInstaller(["uninstall", "--yes", "--codex"]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(calls, [
    "codex --version",
    "codex plugin remove ultragoal-codex@shamilkayal",
    "codex plugin marketplace remove shamilkayal",
  ]);
});

test("update prunes stale project pins whose directories no longer exist", () => {
  const root = mkdtempSync(join(tmpdir(), "ultragoal-prune-"));
  const binDir = makeFakeBin(root, "claude");
  makeFakeBin(root, "codex");
  const callLog = join(root, "calls.log");
  const home = join(root, "home");
  const livePin = join(root, "live-project");
  const deadPin = join(root, "dead-project");
  mkdirSync(livePin, { recursive: true });
  const regPath = join(home, ".claude", "plugins", "installed_plugins.json");
  mkdirSync(dirname(regPath), { recursive: true });
  writeFileSync(
    regPath,
    JSON.stringify(
      {
        plugins: {
          "ultragoal@ultragoal": [
            { scope: "user", version: "1.11.0" },
            { scope: "project", projectPath: livePin, version: "1.11.0" },
            { scope: "project", projectPath: deadPin, version: "1.2.0" },
          ],
          "other@keep": [{ scope: "project", projectPath: deadPin, version: "0.1.0" }],
        },
      },
      null,
      2
    )
  );

  const result = spawnSync(process.execPath, [cli, "update"], {
    cwd: root,
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      CALL_LOG: callLog,
      HOME: home,
      NO_COLOR: "1",
    },
    encoding: "utf8",
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);
  const reg = JSON.parse(readFileSync(regPath, "utf8"));
  rmSync(root, { recursive: true, force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout + result.stderr, /Pruned 1 stale project pin/);
  const pins = reg.plugins["ultragoal@ultragoal"];
  assert.equal(pins.length, 2, JSON.stringify(pins));
  assert.ok(!pins.some((pin) => pin.projectPath === deadPin), "dead pin removed");
  assert.ok(pins.some((pin) => pin.projectPath === livePin), "live pin kept");
  assert.deepEqual(reg.plugins["other@keep"], [{ scope: "project", projectPath: deadPin, version: "0.1.0" }], "other plugins untouched");
  assert.ok(!calls.some((line) => line.includes(deadPin)), "no update attempted for the dead pin");
  assert.ok(calls.some((line) => line.includes("plugin update ultragoal@ultragoal --scope project")), "live project pin updated");
});
