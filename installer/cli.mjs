#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, rmSync, unlinkSync, readdirSync, statSync } from 'node:fs';
import { delimiter, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const CLAUDE_MARKETPLACE = 'morphaxl/ultragoal';
const CLAUDE_MARKETPLACE_NAME = 'ultragoal';
const CLAUDE_PLUGIN = 'ultragoal@ultragoal';
const CODEX_MARKETPLACE = 'morphaxl/ultragoal';
const CODEX_MARKETPLACE_NAME = 'morphaxl';
const CODEX_PLUGIN = 'ultragoal-codex@morphaxl';
const DOCS = 'https://github.com/morphaxl/ultragoal';
let CODEX_BIN = null;

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const interactive = process.stdout.isTTY && !flag('--yes');

// ---------------------------------------------------------------- banner ---
const BANNER = [
  '       _ _                              _',
  ' _   _| | |_ _ __ __ _  __ _  ___   __ _| |',
  '| | | | | __| `__/ _` |/ _` |/ _ \\ / _` | |',
  '| |_| | | |_| | | (_| | (_| | (_) | (_| | |',
  ' \\__,_|_|\\__|_|  \\__,_|\\__, |\\___/ \\__,_|_|',
  '                       |___/',
];
function banner() {
  const tints = [pc.cyan, pc.cyan, pc.blue, pc.blue, pc.magenta, pc.magenta];
  console.log('\n' + BANNER.map((l, i) => tints[i](l)).join('\n'));
  console.log(pc.dim('  goal loops for agents — brief → goal → loop → verify → distill\n'));
}

// --------------------------------------------------------------- commands ---
function runBin(bin, cmdArgs, { quiet = true, cwd } = {}) {
  const res = spawnSync(bin, cmdArgs, {
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
    cwd,
  });
  if (res.error && res.error.code === 'ENOENT') return { missing: true, status: 1 };
  return res;
}

function claude(cmdArgs, opts) {
  return runBin('claude', cmdArgs, opts);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function resolveCodexBin() {
  if (CODEX_BIN) return CODEX_BIN;
  const pathCandidates = (process.env.PATH || '')
    .split(delimiter)
    .filter(Boolean)
    .map((dir) => join(dir, process.platform === 'win32' ? 'codex.cmd' : 'codex'));
  const candidates = unique([
    process.env.ULTRAGOAL_CODEX_BIN,
    ...pathCandidates,
    join(homedir(), '.bun', 'bin', process.platform === 'win32' ? 'codex.cmd' : 'codex'),
  ]);
  for (const candidate of candidates) {
    if (candidate !== 'codex' && !existsSync(candidate)) continue;
    const probe = runBin(candidate, ['--version']);
    if ((probe.status ?? 1) === 0) {
      CODEX_BIN = candidate;
      return CODEX_BIN;
    }
  }
  CODEX_BIN = 'codex';
  return CODEX_BIN;
}

function codex(cmdArgs, opts) {
  return runBin(resolveCodexBin(), cmdArgs, opts);
}

function bail(msg) {
  p.cancel(msg);
  process.exit(1);
}

function targetFlags() {
  const targets = new Set();
  if (flag('--all') || flag('--both')) {
    targets.add('claude');
    targets.add('codex');
  }
  if (flag('--claude')) targets.add('claude');
  if (flag('--codex')) targets.add('codex');
  return targets.size > 0 ? [...targets] : null;
}

function hasTarget(targets, target) {
  return targets.includes(target);
}

function targetList(targets) {
  return targets.map((target) => (target === 'claude' ? 'Claude Code' : 'Codex')).join(' + ');
}

function oneLineOutput(res) {
  return ((res?.stdout || '') + (res?.stderr || '')).trim().split('\n').filter(Boolean).pop() || '';
}

function commandFailure(res) {
  if (res?.missing) return 'command not found';
  return oneLineOutput(res) || `exit ${res?.status ?? 1}`;
}

function findUltragoalRoot(start = process.cwd()) {
  let d = start;
  while (d && d !== '/' && d !== homedir()) {
    if (existsSync(join(d, '.ultragoal'))) return d;
    const next = resolve(d, '..');
    if (next === d) break;
    d = next;
  }
  return start;
}

function readFrontmatterField(text, field) {
  const match = text.match(new RegExp(`^${field}:\\s*(.+?)\\s*$`, 'm'));
  return match ? match[1].trim() : '';
}

function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^#+\\s+${heading}\\s*$`, 'i').test(line));
  if (start === -1) return '';
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#+\s+/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

function normalizeRubricForHash(rubric) {
  const out = [];
  let inEvidence = false;
  for (const raw of rubric.split(/\r?\n/)) {
    const line = raw.replace(/^(\s*-\s*)\[[xX ]\]/, '$1[ ]');
    if (/^\s*-\s*evidence:/.test(line)) {
      inEvidence = true;
      continue;
    }
    if (inEvidence && (/^\s*-\s*\[/.test(line) || /^\s*-\s*check:/.test(line) || /^\S/.test(line))) {
      inEvidence = false;
    }
    if (inEvidence) continue;
    out.push(line);
  }
  return out.join('\n');
}

function cksum(text) {
  const res = spawnSync('cksum', { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  if ((res.status ?? 1) !== 0) return '';
  return (res.stdout || '').trim().split(/\s+/)[0] || '';
}

function listGoalFiles(base) {
  if (!existsSync(base)) return [];
  const files = [];
  for (const name of readdirSync(base)) {
    const goal = join(base, name, 'goal.md');
    if (existsSync(goal)) files.push(goal);
  }
  return files;
}

function findCurrentGoalFile(root, sinceMs = 0) {
  const ug = join(root, '.ultragoal');
  const candidates = [
    ...listGoalFiles(join(ug, 'goals', 'active')),
    ...listGoalFiles(join(ug, 'codex-goals')),
  ];
  const active = candidates
    .map((file) => {
      try {
        const text = readFileSync(file, 'utf8');
        return { file, text, mtime: statSync(file).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter(({ text }) => ['active', 'done'].includes(readFrontmatterField(text, 'status')))
    .filter(({ mtime }) => !sinceMs || mtime >= sinceMs)
    .filter(({ text, file }) => !file.includes(`${join('.ultragoal', 'codex-goals')}`) || ['', 'active', 'done'].includes(readFrontmatterField(text, 'codex_goal')));
  active.sort((a, b) => b.mtime - a.mtime);
  return active[0] || null;
}

function evaluateGoalFile(goal) {
  if (!goal) return { done: true, reason: 'no-active-goal' };
  const { file, text } = goal;
  const slug = readFrontmatterField(text, 'slug') || file;
  const rubric = section(text, 'Rubric');
  const unchecked = rubric.split(/\r?\n/).filter((line) => /^\s*-\s*\[\s\]/.test(line));
  const checkedWithoutEvidence = (() => {
    let missing = 0;
    let checked = false;
    let found = false;
    for (const line of rubric.split(/\r?\n/)) {
      if (/^\s*-\s*\[[xX ]\]/.test(line)) {
        if (checked && !found) missing += 1;
        checked = /\[[xX]\]/.test(line);
        found = false;
      } else if (checked && /evidence:/.test(line)) {
        found = true;
      }
    }
    if (checked && !found) missing += 1;
    return missing;
  })();
  const verify = readFrontmatterField(text, 'verify') || 'on';
  const hash = cksum(normalizeRubricForHash(rubric));
  const verdicts = text.split(/\r?\n/).filter((line) => line.includes('ULTRAGOAL-VERIFIED:'));
  const hasPanel = (lens) => verdicts.some((line) => line.includes('ULTRAGOAL-VERIFIED: PASS') && line.includes(`rubric=${hash}`) && line.includes(`lens=${lens}`));
  const hasPass = verdicts.some((line) => line.includes('ULTRAGOAL-VERIFIED: PASS') && (!hash || line.includes(`rubric=${hash}`)));

  if (unchecked.length > 0) {
    return {
      done: false,
      file,
      prompt: `Continue Ultragoal "${slug}" from ${file}. Remaining unchecked rubric items:\n${unchecked.join('\n')}\nRun the checks, record evidence under each item, and do not finish until verifier requirements pass.`,
    };
  }
  if (checkedWithoutEvidence > 0) {
    return {
      done: false,
      file,
      prompt: `Continue Ultragoal "${slug}" from ${file}. ${checkedWithoutEvidence} checked rubric item(s) have no evidence line. Add command evidence, then verify.`,
    };
  }
  if (verify === 'panel' && !(hasPanel('checks') && hasPanel('refute') && hasPanel('constraints'))) {
    return {
      done: false,
      file,
      prompt: `Continue Ultragoal "${slug}" from ${file}. All boxes are checked, but max-rigor panel verification is incomplete. Run independent checks/refute/constraints verifier passes and append PASS verdicts bound to rubric=${hash}.`,
    };
  }
  if (verify !== 'off' && verify !== 'panel' && !hasPass) {
    return {
      done: false,
      file,
      prompt: `Continue Ultragoal "${slug}" from ${file}. All boxes are checked, but there is no verifier PASS bound to rubric=${hash}. Run the verifier and append its verdict.`,
    };
  }
  return {
    done: readFrontmatterField(text, 'status') === 'done',
    file,
    prompt: `Ultragoal "${slug}" is verified in ${file}. Distill durable lessons if any, set status: done, archive or record completion, then report the outcome.`,
  };
}

function runCodexHeadlessLoop({ prompt, safe }) {
  const approval = safe ? 'on-request' : 'never';
  const maxTurns = Number.parseInt(process.env.ULTRAGOAL_CODEX_RUNNER_MAX_TURNS || '25', 10);
  const baseArgs = ['--sandbox', 'workspace-write', '--ask-for-approval', approval, '--dangerously-bypass-hook-trust'];
  const startedAt = Date.now() - 2000;
  let res = codex([...baseArgs, 'exec', prompt], { quiet: false });
  if ((res.status ?? 1) !== 0) return res.status ?? 1;

  for (let i = 1; i <= maxTurns; i++) {
    const root = findUltragoalRoot(process.cwd());
    const current = findCurrentGoalFile(root, startedAt);
    const state = evaluateGoalFile(current);
    if (state.done) return 0;
    p.log.info(`Codex runner continuing Ultragoal (${i}/${maxTurns}): ${state.file || state.reason}`);
    res = codex([...baseArgs, 'exec', 'resume', '--last', state.prompt], { quiet: false });
    if ((res.status ?? 1) !== 0) return res.status ?? 1;
  }

  p.log.warn(`Codex runner reached ULTRAGOAL_CODEX_RUNNER_MAX_TURNS=${maxTurns}. Leaving the active goal for resume.`);
  return 1;
}

async function chooseInstallTargets() {
  const explicit = targetFlags();
  if (explicit) return explicit;
  if (!interactive) return ['claude'];

  const pick = await p.select({
    message: 'Where should ultragoal be installed?',
    options: [
      { value: 'claude', label: 'Claude Code', hint: 'full hook-gated loop; current default' },
      { value: 'codex', label: 'Codex', hint: 'hook-backed Codex goal loop + native Goal-mode skill' },
      { value: 'both', label: 'Both', hint: 'Claude loop + Codex loop' },
    ],
    initialValue: 'claude',
  });
  if (p.isCancel(pick)) bail('Cancelled.');
  return pick === 'both' ? ['claude', 'codex'] : [pick];
}

function checkClaudeCli(spinner) {
  spinner.start('Checking for Claude Code');
  const probe = claude(['--version']);
  if (probe.missing) {
    spinner.stop(pc.red('Claude Code CLI not found'));
    bail('Install Claude Code first: https://claude.com/claude-code');
  }
  if ((probe.status ?? 1) !== 0) {
    spinner.stop(pc.red('Claude Code check failed'));
    bail(`Claude Code CLI is installed but not healthy: ${commandFailure(probe)}`);
  }
  spinner.stop(`Claude Code ${pc.dim((probe.stdout || '').trim().split(' ')[0] || 'found')}`);
}

function checkCodexCli(spinner) {
  spinner.start('Checking for Codex');
  const probe = codex(['--version']);
  if (probe.missing) {
    spinner.stop(pc.red('Codex CLI not found'));
    bail('Install Codex first, then rerun: npx ultragoal --codex');
  }
  if ((probe.status ?? 1) !== 0) {
    spinner.stop(pc.red('Codex check failed'));
    bail(`Codex CLI is installed but not healthy: ${commandFailure(probe)}`);
  }
  spinner.stop(`Codex ${pc.dim((probe.stdout || '').trim().split(' ')[0] || 'found')}`);
}

async function chooseClaudeScope() {
  let scope = flag('--global') ? 'user' : 'project';
  if (interactive && !flag('--project') && !flag('--global')) {
    const pick = await p.select({
      message: 'Where should the Claude Code plugin be installed?',
      options: [
        { value: 'project', label: 'Only this project', hint: 'recommended — written to .claude/settings.json, teammates get it via git' },
        { value: 'user', label: 'Globally', hint: 'every project on this machine' },
      ],
      initialValue: 'project',
    });
    if (p.isCancel(pick)) bail('Cancelled.');
    scope = pick;
  }
  return scope;
}

function installClaudePlugin(spinner, scope) {
  checkClaudeCli(spinner);

  spinner.start('Adding the Claude Code marketplace');
  const add = claude(['plugin', 'marketplace', 'add', CLAUDE_MARKETPLACE]);
  if (add.status !== 0) claude(['plugin', 'marketplace', 'update', CLAUDE_MARKETPLACE_NAME]);
  spinner.stop('Claude Code marketplace ready');

  spinner.start('Installing the Claude Code plugin');
  let res = claude(['plugin', 'install', CLAUDE_PLUGIN, '--scope', scope]);
  if (res.status !== 0) res = claude(['plugin', 'update', CLAUDE_PLUGIN, '--scope', scope]);
  if ((res.status ?? 1) !== 0) {
    spinner.stop(pc.red('Claude Code install failed'));
    bail(`Try the manual route:\n  claude plugin marketplace add ${CLAUDE_MARKETPLACE}\n  claude plugin install ${CLAUDE_PLUGIN} --scope ${scope}`);
  }
  spinner.stop(`Claude Code plugin installed ${pc.dim(`(${scope} scope)`)}`);
}

function installCodexPlugin(spinner) {
  checkCodexCli(spinner);

  spinner.start('Adding the Codex marketplace');
  const add = codex(['plugin', 'marketplace', 'add', CODEX_MARKETPLACE]);
  if (add.status !== 0) {
    const up = codex(['plugin', 'marketplace', 'upgrade', CODEX_MARKETPLACE_NAME]);
    if ((up.status ?? 1) !== 0) {
      spinner.stop(pc.red('Codex marketplace setup failed'));
      bail(`Try the manual route:\n  codex plugin marketplace add ${CODEX_MARKETPLACE}\n  codex plugin add ${CODEX_PLUGIN}`);
    }
  }
  spinner.stop('Codex marketplace ready');

  spinner.start('Installing the Codex plugin');
  const res = codex(['plugin', 'add', CODEX_PLUGIN]);
  if ((res.status ?? 1) !== 0) {
    spinner.stop(pc.red('Codex install failed'));
    bail(`Try the manual route:\n  codex plugin marketplace add ${CODEX_MARKETPLACE}\n  codex plugin add ${CODEX_PLUGIN}`);
  }
  spinner.stop('Codex plugin installed');
}

// ------------------------------------------------------------------ help ---
if (flag('--help') || flag('-h')) {
  banner();
  console.log(`  ${pc.bold('Usage')}
    npx ultragoal              interactive install (choose Claude, Codex, or both)
    npx ultragoal --yes        non-interactive: Claude project-scope install, no prompts
    npx ultragoal --claude     install only the Claude Code loop
    npx ultragoal --codex      install the Codex hook-backed goal loop plugin
    npx ultragoal --all        install both Claude Code and Codex surfaces
    npx ultragoal --project    install at project scope (the default; team-shared via git)
    npx ultragoal --global     install machine-wide (user scope) instead
    npx ultragoal --setup      pre-configure the current repo (with --yes: defaults);
                               on an already-configured repo: reconfigure the knobs
                               (memory, goals, and hand-tuned rows are preserved)
    npx ultragoal run "<brief>"
                               full-autonomy goal run: launches Claude Code with the goal
                               armed and --dangerously-skip-permissions (no prompts at all)
    npx ultragoal run --codex "<brief>"
                               Codex goal run: installs the Codex plugin, then launches Codex
                               with the ultragoal skill; add --headless for codex exec
                               (workspace-write, approvals never, hook-trust bypass)
        --safe                 auto mode instead: tools auto-approved, guardrails stay on
        --worktree             run in a fresh git worktree — isolated checkout, so
                               parallel goals on one repo can't collide
        --headless             non-interactive: runs the loop to completion and exits
    npx ultragoal update       update Claude Code installs — user scope and all
                               per-project pins
    npx ultragoal update --codex
                               refresh the Codex marketplace and plugin
    npx ultragoal update --all update both Claude Code and Codex
    npx ultragoal uninstall    remove the plugin + marketplace (keeps your repo data)
    npx ultragoal uninstall --codex
                               remove only the Codex plugin + marketplace
    npx ultragoal uninstall --purge
                               also delete this repo's .ultragoal/ and CLAUDE.md block

  Claude Code install:
    claude plugin marketplace add ${CLAUDE_MARKETPLACE}
    claude plugin install ${CLAUDE_PLUGIN} [--scope project]

  Codex install:
    codex plugin marketplace add ${CODEX_MARKETPLACE}
    codex plugin add ${CODEX_PLUGIN}

  Docs: ${DOCS}
`);
  process.exit(0);
}

// ------------------------------------------------------------------- run ---
if (args[0] === 'run') {
  const rest = args.slice(1);
  const codexRun = rest.includes('--codex');
  const safe = rest.includes('--safe');
  const headless = rest.includes('--headless');
  const worktree = rest.includes('--worktree');
  const brief = rest.filter((a) => !a.startsWith('--')).join(' ').trim();
  banner();
  p.intro(pc.bgGreen(pc.black(' ultragoal autopilot ')));
  if (!brief) {
    bail('Give it a brief: npx ultragoal run "checkout is slow, get p95 under 200ms without breaking contract tests"');
  }
  if (codexRun) {
    if (worktree) bail('Codex run does not support --worktree yet. Use git worktree manually, cd into it, then run npx ultragoal run --codex.');
    const s0 = p.spinner();
    installCodexPlugin(s0);
    const prompt = `$ultragoal-goal ${brief}`;
    if (headless) {
      p.log.info('Codex headless mode: workspace-write sandbox, plugin hook trust bypassed for this vetted run, with file-backed resume checks between turns.');
      p.outro('Running the Codex goal loop headless — output follows.');
      process.exit(runCodexHeadlessLoop({ prompt, safe }));
    } else {
      p.log.info('Codex interactive mode: review/trust bundled hooks with /hooks if Codex asks.');
      const codexArgs = ['--sandbox', 'workspace-write', '--ask-for-approval', 'on-request', prompt];
      p.outro('Handing you over to Codex with the Ultragoal skill prompt.');
      const launch = codex(codexArgs, { quiet: false });
      process.exit(launch.status ?? 0);
    }
  }
  const cv = claude(['--version']);
  if (cv.missing) bail('Install Claude Code first: https://claude.com/claude-code');

  // ensure the plugin is present — idempotent and quiet
  const s0 = p.spinner();
  s0.start('Making sure ultragoal is installed');
  const a0 = claude(['plugin', 'marketplace', 'add', CLAUDE_MARKETPLACE]);
  if (a0.status !== 0) claude(['plugin', 'marketplace', 'update', CLAUDE_MARKETPLACE_NAME]);
  claude(['plugin', 'install', CLAUDE_PLUGIN]);
  s0.stop('Plugin ready');

  const mode = safe ? ['--permission-mode', 'auto'] : ['--dangerously-skip-permissions'];
  if (safe) {
    p.log.info('Safe mode: tool calls auto-approved within each turn, permission guardrails stay on.');
  } else {
    p.log.warn('Full autonomy (the default): --dangerously-skip-permissions — Claude can run any command without asking until the goal is done. Best in a repo you can reset or a container; add --safe to keep permission guardrails, --worktree for an isolated checkout.');
  }
  if (worktree) p.log.info('Worktree: the goal runs in a fresh checkout on its own branch — merge it when the goal is done.');
  p.outro(headless ? 'Running the goal loop headless — output follows.' : 'Handing you over to Claude Code with the goal armed.');
  const launch = spawnSync('claude', [...mode, ...(worktree ? ['--worktree'] : []), ...(headless ? ['-p'] : []), `/ultragoal:goal ${brief}`], {
    stdio: 'inherit',
  });
  process.exit(launch.status ?? 0);
}

// ---------------------------------------------------------------- update ---
if (args[0] === 'update') {
  banner();
  p.intro(pc.bgBlue(pc.black(' ultragoal updater ')));
  const targets = targetFlags() ?? ['claude'];
  const us = p.spinner();

  let ok = 0, failed = 0, skipped = 0;

  if (hasTarget(targets, 'claude')) {
    us.start('Refreshing the Claude Code marketplace');
    const mk = claude(['plugin', 'marketplace', 'update', CLAUDE_MARKETPLACE_NAME]);
    if (mk.missing) {
      us.stop(pc.dim('Claude Code CLI not found — skipped'));
      skipped++;
    } else if (mk.status !== 0) {
      us.stop(pc.dim('Claude Code marketplace not registered — skipped'));
      skipped++;
    } else {
      us.stop('Claude Code marketplace refreshed');

      // Update EVERY Claude install, not just user scope. Project-scoped
      // installs pin their version per project and are skipped by Claude Code's
      // startup auto-update, so they go stale silently — sweep them all here.
      let installs = [];
      try {
        const reg = JSON.parse(readFileSync(join(homedir(), '.claude', 'plugins', 'installed_plugins.json'), 'utf8'));
        installs = reg.plugins?.[CLAUDE_PLUGIN] ?? [];
      } catch {
        /* registry unreadable — fall back to a plain user-scope update */
      }
      if (installs.length === 0) installs = [{ scope: 'user' }];

      for (const inst of installs) {
        const where = inst.projectPath ? `${inst.scope} scope · ${inst.projectPath}` : `${inst.scope} scope`;
        if (inst.projectPath && !existsSync(inst.projectPath)) {
          p.log.info(pc.dim(`Skipped ${where} — directory no longer exists`));
          skipped++;
          continue;
        }
        us.start(`Updating Claude Code ${where}`);
        const up = claude(['plugin', 'update', CLAUDE_PLUGIN, '--scope', inst.scope], { cwd: inst.projectPath });
        if ((up.status ?? 1) === 0) {
          const line = ((up.stdout || '') + (up.stderr || '')).trim().split('\n').pop() || 'updated';
          us.stop(`${where}: ${line.replace(/^[✔✖]\s*/, '').replace(/ \(.*\)\.?/, '').replace(/ Restart.*$/, '')}`);
          ok++;
        } else {
          us.stop(pc.red(`${where}: update failed`));
          failed++;
        }
      }
    }
  }

  if (hasTarget(targets, 'codex')) {
    us.start('Refreshing the Codex marketplace');
    const mk = codex(['plugin', 'marketplace', 'upgrade', CODEX_MARKETPLACE_NAME]);
    if (mk.missing) {
      us.stop(pc.dim('Codex CLI not found — skipped'));
      skipped++;
    } else if (mk.status !== 0) {
      us.stop(pc.dim('Codex marketplace not registered — skipped'));
      skipped++;
    } else {
      us.stop('Codex marketplace refreshed');
      us.start('Installing latest Codex plugin');
      const add = codex(['plugin', 'add', CODEX_PLUGIN]);
      if ((add.status ?? 1) === 0) {
        us.stop('Codex plugin updated');
        ok++;
      } else {
        us.stop(pc.red('Codex plugin update failed'));
        failed++;
      }
    }
  }

  if (ok === 0 && skipped === 0) bail('No install could be updated — is it installed? Run: npx ultragoal');
  const tally = [`${ok} updated`, skipped && `${skipped} skipped`, failed && `${failed} failed`].filter(Boolean).join(', ');
  const restart = hasTarget(targets, 'claude') ? ' Restart Claude Code sessions to apply.' : '';
  p.outro(pc.green(`ultragoal update finished (${tally}).`) + pc.dim(restart));
  process.exit(0);
}

// ------------------------------------------------------------- uninstall ---
if (args[0] === 'uninstall') {
  banner();
  p.intro(pc.bgMagenta(pc.black(' ultragoal uninstaller ')));
  const targets = targetFlags() ?? ['claude', 'codex'];

  const us = p.spinner();
  let touched = false;

  if (hasTarget(targets, 'claude')) {
    us.start('Removing the Claude Code plugin');
    const res = claude(['plugin', 'uninstall', CLAUDE_PLUGIN]);
    if (res.missing) {
      us.stop(pc.dim('Claude Code CLI not found — skipped'));
    } else {
      touched = true;
      us.stop(res.status === 0 ? 'Claude Code plugin removed' : pc.dim('Claude Code plugin was not installed'));

      us.start('Removing the Claude Code marketplace entry');
      const mk = claude(['plugin', 'marketplace', 'remove', CLAUDE_MARKETPLACE_NAME]);
      us.stop(mk.status === 0 ? 'Claude Code marketplace removed' : pc.dim('Claude Code marketplace was not registered'));
    }
  }

  if (hasTarget(targets, 'codex')) {
    us.start('Removing the Codex plugin');
    const res = codex(['plugin', 'remove', CODEX_PLUGIN]);
    if (res.missing) {
      us.stop(pc.dim('Codex CLI not found — skipped'));
    } else {
      touched = true;
      us.stop(res.status === 0 ? 'Codex plugin removed' : pc.dim('Codex plugin was not installed'));

      us.start('Removing the Codex marketplace entry');
      const mk = codex(['plugin', 'marketplace', 'remove', CODEX_MARKETPLACE_NAME]);
      us.stop(mk.status === 0 ? 'Codex marketplace removed' : pc.dim('Codex marketplace was not registered'));
    }
  }

  if (!touched) bail('Nothing to uninstall from: none of the selected CLIs were found.');

  // Per-repo state: yours by default — only deleted on explicit request.
  const root = process.cwd();
  const ug = join(root, '.ultragoal');
  if (existsSync(ug)) {
    let purge = flag('--purge');
    if (!purge && interactive) {
      const yn = await p.confirm({
        message: 'Also delete this repo\'s .ultragoal/ (goals + memory) and the CLAUDE.md block?',
        initialValue: false,
      });
      if (p.isCancel(yn)) bail('Cancelled.');
      purge = yn;
    }
    if (purge) {
      rmSync(ug, { recursive: true, force: true });
      const cm = join(root, 'CLAUDE.md');
      if (existsSync(cm)) {
        const stripped = readFileSync(cm, 'utf8')
          .replace(/\n*<!-- ultragoal:start[\s\S]*?<!-- ultragoal:end -->\n*/, '\n')
          .trim();
        if (stripped) writeFileSync(cm, stripped + '\n');
        else unlinkSync(cm);
      }
      const gi = join(root, '.gitignore');
      if (existsSync(gi)) {
        const kept = readFileSync(gi, 'utf8')
          .split('\n')
          .filter((l) => !/^# ultragoal local state$|^\.ultragoal\//.test(l.trim()))
          .join('\n')
          .replace(/\n{3,}/g, '\n\n');
        if (kept.trim()) writeFileSync(gi, kept);
        else unlinkSync(gi);
      }
      p.log.success('Repo state deleted (.ultragoal/, CLAUDE.md block, .gitignore entries).');
    } else {
      p.log.info('Kept this repo\'s .ultragoal/ — your goals and memory are yours. Delete later with: npx ultragoal uninstall --purge');
    }
  }

  p.outro(pc.green(`ultragoal uninstall finished for ${targetList(targets)}.`) + pc.dim(' Reinstall anytime: npx ultragoal'));
  process.exit(0);
}

// ----------------------------------------------------------- knob blocks ---
const KNOBS = {
  action: {
    question: 'When intent is unclear, should Claude act or ask?',
    options: [
      { value: 'proactive', label: 'Proactive', hint: 'recommended — implement, don’t just suggest' },
      { value: 'conservative', label: 'Conservative', hint: 'recommend first, change only when asked' },
    ],
    blocks: {
      proactive:
        '<default_to_action>\nBy default, implement changes rather than only suggesting them. If the user\'s intent is unclear, infer the most useful likely action and proceed, using tools to discover any missing details instead of guessing.\n</default_to_action>',
      conservative:
        '<do_not_act_before_instructions>\nDo not jump into implementation or change files unless clearly instructed to make changes. When the user\'s intent is ambiguous, default to providing information, doing research, and providing recommendations rather than taking action.\n</do_not_act_before_instructions>',
    },
  },
  communication: {
    question: 'How should Claude report back?',
    options: [
      { value: 'lead-with-outcome', label: 'Lead with the outcome', hint: 'recommended — TLDR first, detail after' },
      { value: 'detailed', label: 'Detailed', hint: 'thorough summaries of what and why' },
    ],
    blocks: {
      'lead-with-outcome':
        'Lead with the outcome. Your first sentence after finishing should answer "what happened" or "what did you find" — the thing the user would ask for if they said "just give me the TLDR." Supporting detail and reasoning come after. Keep output short by being selective about what you include, not by compressing the writing into fragments or jargon.',
      detailed:
        'After completing a task that involves tool use, provide a thorough summary of the work you\'ve done: what changed and why, how it was verified, and what trade-offs were considered. Write complete sentences; spell out terms the user hasn\'t seen this session.',
    },
  },
  scope: {
    question: 'How tightly should Claude scope its changes?',
    options: [
      { value: 'elaborate-ok', label: 'Polish welcome', hint: 'recommended — reasonable extras, named in the summary' },
      { value: 'minimal', label: 'Minimal', hint: 'only what the task requires' },
    ],
    blocks: {
      minimal:
        'Don\'t add features, refactor, or introduce abstractions beyond what the task requires. A bug fix doesn\'t need surrounding cleanup. Don\'t design for hypothetical future requirements: do the simplest thing that works well. Only validate at system boundaries (user input, external APIs).',
      'elaborate-ok':
        'Reasonable polish beyond the literal request is welcome — tests for adjacent edge cases, small refactors the change obviously motivates — but name what you added beyond the ask in your summary so the user can drop it.',
    },
  },
  memory: {
    question: 'Share project memory with your team via git?',
    options: [
      { value: 'git', label: 'Git-committed', hint: 'recommended — the team’s compounding brain' },
      { value: 'local', label: 'Local only', hint: 'gitignored, just for you' },
    ],
  },
  verification: {
    question: 'Require independent verification before a goal can finish?',
    options: [
      { value: 'on', label: 'On', hint: 'recommended — a fresh-context verifier re-runs every check' },
      { value: 'off', label: 'Off', hint: 'faster: checked rubric + saved lessons suffice, no verifier pass' },
    ],
  },
  rigor: {
    question: 'How much scaffolding should the harness wrap around the model? (match to model strength)',
    options: [
      { value: 'vanilla', label: 'Vanilla', hint: 'recommended for strong models (Fable) — the lean single-grader loop' },
      { value: 'standard', label: 'Standard', hint: 'bells & whistles: interim re-checks, double-runs, scouts, log monitor' },
      { value: 'max', label: 'Max', hint: 'for weaker models / release stakes: 3-lens panel, every-claim, multi-modal sweeps' },
    ],
  },
  harnessLog: {
    question: 'Keep a local harness-feedback log? (when you flag a harness mistake, ultragoal records why it failed + how to improve)',
    options: [
      { value: 'off', label: 'Off', hint: 'recommended default — no log kept' },
      { value: 'on', label: 'On', hint: 'opt-in: writes .ultragoal/harness-log.md locally; never transmitted, sharing is manual' },
    ],
    blocks: {
      on:
        "## Harness feedback log (ultragoal)\n\nWhen the user signals the harness itself misbehaved — a wrong default, a misleading interview question, a missing or weak rubric check, ceremony on a task that didn't need a goal, a gate that fired wrongly, an undersized budget — append a self-observation to `.ultragoal/harness-log.md` (create it if missing). Reason about ultragoal, not the project: which harness component was at fault (rubric / gate / verifier / interview / skill-prompt / budget / memory), why it let the mistake through, and the concrete change to ultragoal that would prevent that class. One entry per incident: `## [date] <title>` then `- trigger:` / `- component:` / `- why:` / `- improvement:` / `- provenance: [USER-FEEDBACK · date]`. Keep it distinct from project memory — a harness shortcoming goes here; a project dead end goes in `failures.md`; a project fact/correction goes in memory with `[USER-CORRECTION]`. It is local markdown only — never transmitted; sharing is yours to initiate.",
    },
  },
};

const FIXED_CORE = `<!-- ultragoal:start — managed block; edit knobs via /ultragoal:setup or by hand -->
## Memory & goals (ultragoal)

- Before substantial work, consult \`.ultragoal/memory/MEMORY.md\` and the relevant topic files. Trust \`[VERIFIED]\` claims; treat \`[READ]\` as only as good as its source and \`[INFERRED]\` as hypotheses to re-check before relying on them.
- When you learn something durable — a confirmed approach, a dead end, an expensive derivation you'd hate to redo — record it per the memory protocol (the \`ultragoal:remember\` skill). Don't save what the repo or git history already records; update entries rather than duplicating.
- When the user corrects you, write it to memory immediately (\`[USER-CORRECTION]\`) — it's the highest-confidence signal there is, and it dies with the session if deferred.
- Memory files are two layers: compiled truth above the \`---\` (rewrite freely), dated evidence log below it (append-only — never edit or delete evidence lines).
- Active goals live in \`.ultragoal/goals/active/<slug>/goal.md\` (one per session). Never check a rubric box without evidence from a command run this session, and never self-certify the VERIFIER item.
- Before reporting progress, audit each claim against a tool result from this session. If tests fail, say so with the output; if a step was skipped, say that.`;

const MEMORY_FILES = {
  'MEMORY.md': `# Memory index

<!-- resolver: this is the index + fixed slots. One line per entry elsewhere; no entry
     bodies here. Its head is injected into every session — keep it under 100 lines. -->

## Commands
- build: [no data yet]
- test: [no data yet]
- lint: [no data yet]
- run locally: [no data yet]

## Architecture invariants
[no data yet]

## Gotchas
[no data yet]

## Hot files
[no data yet]

## Index
[no entries yet — first ones come from /ultragoal:remember]
`,
  'facts.md': `# Verified facts

<!-- resolver: things TRUE OF THIS REPO — schemas, behaviors, invariants, tool quirks.
     NOT here: reusable approaches (patterns.md), things we tried that failed (failures.md).
     Above the line: compiled truth, rewritten freely, every claim tagged
     [VERIFIED Sn · how · date] / [READ Sn · source] / [INFERRED Sn · confidence] /
     [USER-CORRECTION · date].
     Below the line: append-only dated evidence — never edit or delete. -->

## Current understanding

---

## Evidence log
`,
  'patterns.md': `# Patterns that work

<!-- resolver: REUSABLE APPROACHES that worked here, with why they worked.
     NOT here: repo facts (facts.md), dead ends (failures.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

---

## Evidence log
`,
  'failures.md': `# Dead ends

<!-- resolver: things TRIED THAT FAILED — what was attempted, why it failed, what to do
     instead. Consult before re-attempting anything ambitious.
     NOT here: working approaches (patterns.md), repo facts (facts.md).
     Same two layers: compiled above the ---, dated evidence below. -->

## Current understanding

---

## Evidence log
`,
};

const HARNESS_LOG_TEMPLATE = `# Harness feedback log

<!-- ultragoal's own failure observations, for improving the plugin. OPT-IN via the harness-log knob.
     Local markdown only — never transmitted; you choose whether to share it.
     Distinct from project memory: harness shortcomings go HERE; project dead ends go in
     memory/failures.md; project facts/corrections go in memory with [USER-CORRECTION].
     One entry per incident, newest at the bottom:
       ## [YYYY-MM-DD] <short title>
       - trigger: <what the user flagged / what didn't work>
       - component: rubric | gate | verifier | interview | skill-prompt | budget | memory | other
       - why: <why the harness caused or allowed it>
       - improvement: <the concrete change to ultragoal that would prevent this class>
       - provenance: [USER-FEEDBACK · date] | [INFERRED] -->
`;

function readKnobs(root) {
  // current knob values from an existing config.md (empty object if none)
  try {
    const t = readFileSync(join(root, '.ultragoal', 'config.md'), 'utf8');
    const g = (k) => ((t.match(new RegExp(`\\|\\s*${k}\\s*\\|\\s*([^|\\n]+)\\|`)) || [])[1] || '').trim() || undefined;
    return {
      action: g('action-mode'),
      communication: g('communication'),
      scope: g('scope'),
      memory: g('memory-sharing'),
      verification: g('verification'),
      rigor: g('rigor'),
      harnessLog: g('harness-log'),
      budget: g('default-budget'),
      cadence: g('verification-cadence'),
      interview: g('interview-depth'),
      autoupdate: g('auto-update'),
    };
  } catch {
    return {};
  }
}

function writeRepoSetup(root, picks) {
  const ug = join(root, '.ultragoal');
  mkdirSync(join(ug, 'goals', 'archive'), { recursive: true });
  mkdirSync(join(ug, 'memory'), { recursive: true });

  // hand-tuned rows survive a reconfigure
  const prev = readKnobs(root);
  writeFileSync(
    join(ug, 'config.md'),
    `# ultragoal config

Plain markdown, hand-editable. Skills read this file; re-run /ultragoal:setup to change knobs interactively.

| Knob | Value |
|---|---|
| rigor | ${picks.rigor} |
| action-mode | ${picks.action} |
| communication | ${picks.communication} |
| scope | ${picks.scope} |
| memory-sharing | ${picks.memory} |
| verification | ${picks.verification} |
| harness-log | ${picks.harnessLog} |
| default-budget | ${prev.budget || '25'} |
| verification-cadence | ${prev.cadence || 'final'} |
| interview-depth | ${prev.interview || 'adaptive'} |
| auto-update | ${prev.autoupdate || 'on'} |
`
  );

  for (const [name, content] of Object.entries(MEMORY_FILES)) {
    const f = join(ug, 'memory', name);
    if (!existsSync(f)) writeFileSync(f, content);
  }
  // opt-in harness-feedback log: seed the local file when the knob is on
  if (picks.harnessLog === 'on') {
    const hl = join(ug, 'harness-log.md');
    if (!existsSync(hl)) writeFileSync(hl, HARNESS_LOG_TEMPLATE);
  }
  writeFileSync(join(ug, 'goals', 'archive', '.gitkeep'), '');

  // .gitignore entries
  const gi = join(root, '.gitignore');
  const wanted = ['.ultragoal/goals/active/*/.turns', '.ultragoal/goals/active/*/.rubric-hash', '.ultragoal/memory/.sessions'];
  if (picks.memory === 'local') wanted.push('.ultragoal/memory/');
  let existing = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  if (picks.memory === 'git' && /^\.ultragoal\/memory\/\s*$/m.test(existing)) {
    // switched local -> git: stop ignoring the memory so it can be committed
    existing = existing.split('\n').filter((l) => l.trim() !== '.ultragoal/memory/').join('\n');
    writeFileSync(gi, existing);
  }
  const missing = wanted.filter((l) => !existing.includes(l));
  if (missing.length) appendFileSync(gi, `\n# ultragoal local state\n${missing.join('\n')}\n`);

  // CLAUDE.md managed block
  const blocks = [
    FIXED_CORE,
    KNOBS.action.blocks[picks.action],
    KNOBS.communication.blocks[picks.communication],
    KNOBS.scope.blocks[picks.scope],
    ...(picks.harnessLog === 'on' ? [KNOBS.harnessLog.blocks.on] : []),
    '<!-- ultragoal:end -->',
  ].join('\n\n');
  const cm = join(root, 'CLAUDE.md');
  if (existsSync(cm)) {
    const cur = readFileSync(cm, 'utf8');
    if (cur.includes('<!-- ultragoal:start')) {
      writeFileSync(cm, cur.replace(/<!-- ultragoal:start[\s\S]*?<!-- ultragoal:end -->/, blocks));
    } else {
      writeFileSync(cm, cur.trimEnd() + '\n\n' + blocks + '\n');
    }
  } else {
    writeFileSync(cm, blocks + '\n');
  }
}

// ------------------------------------------------------------------ main ---
banner();
p.intro(pc.bgCyan(pc.black(' ultragoal installer ')));
const installTargets = await chooseInstallTargets();
p.log.info(`Installing for: ${targetList(installTargets)}`);

const s = p.spinner();
const claudeScope = hasTarget(installTargets, 'claude') ? await chooseClaudeScope() : null;

if (hasTarget(installTargets, 'claude')) installClaudePlugin(s, claudeScope);
if (hasTarget(installTargets, 'codex')) installCodexPlugin(s);

// Optional repo pre-configuration. This writes CLAUDE.md, so it is offered only
// when the Claude Code surface is being installed.
let didSetup = false;
const root = process.cwd();
const alreadySetup = existsSync(join(root, '.ultragoal'));
const canSetupRepo = hasTarget(installTargets, 'claude');
let wantSetup = canSetupRepo && flag('--setup');
if (interactive && canSetupRepo && !alreadySetup && !wantSetup) {
  const yn = await p.confirm({
    message: 'Pre-configure this repo now? (picks your working style, scaffolds .ultragoal/ — ~30s)',
    initialValue: true,
  });
  if (p.isCancel(yn)) bail('Cancelled.');
  wantSetup = yn;
}

// On an already-configured repo, --setup (or an interactive yes) reconfigures:
// knobs and the CLAUDE.md block are rewritten; memory, goals, and hand-tuned
// config rows (budget, cadence, interview depth) are preserved.
let wantReconfig = alreadySetup && wantSetup;
if (interactive && canSetupRepo && alreadySetup && !wantReconfig) {
  const yn = await p.confirm({
    message: 'This repo is already configured — reconfigure its working style? (rewrites knobs + CLAUDE.md block; memory and goals untouched)',
    initialValue: false,
  });
  if (p.isCancel(yn)) bail('Cancelled.');
  wantReconfig = yn;
}

if ((wantSetup && !alreadySetup) || wantReconfig) {
  const current = readKnobs(root);
  const picks = {
    action: current.action || 'proactive',
    communication: current.communication || 'lead-with-outcome',
    scope: current.scope || 'elaborate-ok',
    memory: current.memory || 'git',
    verification: current.verification || 'on',
    rigor: current.rigor || 'vanilla',
    harnessLog: current.harnessLog || 'off',
  };
  if (interactive) {
    for (const key of ['rigor', 'action', 'communication', 'scope', 'memory', 'verification', 'harnessLog']) {
      const v = await p.select({ message: KNOBS[key].question, options: KNOBS[key].options, initialValue: picks[key] });
      if (p.isCancel(v)) bail('Cancelled.');
      picks[key] = v;
    }
  }
  writeRepoSetup(root, picks);
  didSetup = true;
  if (wantReconfig) {
    p.log.success('Reconfigured: config.md knobs and the CLAUDE.md block updated; memory, goals, and hand-tuned rows untouched.');
  } else {
    p.note(
      `.ultragoal/config.md      your knobs (hand-editable)\n.ultragoal/memory/        two-layer memory, ready to grow\nCLAUDE.md                  ultragoal block ${pc.dim('(marked, easy to remove)')}`,
      'Created in this repo'
    );
  }
} else if (alreadySetup) {
  p.log.info('This repo already has .ultragoal/ — leaving it untouched. Reconfigure anytime: npx ultragoal --setup, or /ultragoal:setup in a session.');
} else if (!canSetupRepo && flag('--setup')) {
  p.log.info('--setup is Claude Code repo setup and was skipped for a Codex-only install.');
}

const nextSteps = [];
if (hasTarget(installTargets, 'claude')) {
  nextSteps.push(`  ${pc.cyan('/ultragoal:goal')} ${pc.dim('<your messy brain dump — a raw voice transcript is fine>')}`);
}
if (hasTarget(installTargets, 'codex')) {
  nextSteps.push(`  ${pc.cyan('$ultragoal-goal')} ${pc.dim('<your messy brain dump — Codex turns it into a native Goal-mode contract>')}`);
}

p.outro(
  `${pc.green('ultragoal is ready.')} Start from:\n\n` +
    `${nextSteps.join('\n')}\n\n` +
    `${didSetup || !canSetupRepo ? '' : pc.dim('First Claude goal in a repo asks 5 quick style questions (or run npx ultragoal --setup).\n')}` +
    pc.dim(`Docs: ${DOCS}`)
);
