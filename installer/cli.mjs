#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const MARKETPLACE = 'morphaxl/ultragoal';
const MARKETPLACE_NAME = 'ultragoal';
const PLUGIN = 'ultragoal@ultragoal';
const DOCS = 'https://github.com/morphaxl/ultragoal';

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
  console.log(pc.dim('  goal loops for Claude Code — brief → goal → loop → verify → distill\n'));
}

// ---------------------------------------------------------------- claude ---
function claude(cmdArgs, { quiet = true } = {}) {
  const res = spawnSync('claude', cmdArgs, {
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (res.error && res.error.code === 'ENOENT') return { missing: true, status: 1 };
  return res;
}

function bail(msg) {
  p.cancel(msg);
  process.exit(1);
}

// ------------------------------------------------------------------ help ---
if (flag('--help') || flag('-h')) {
  banner();
  console.log(`  ${pc.bold('Usage')}
    npx ultragoal              interactive install (scope, optional repo setup)
    npx ultragoal --yes        non-interactive: project-scope install, no prompts
    npx ultragoal --project    install at project scope (the default; team-shared via git)
    npx ultragoal --global     install machine-wide (user scope) instead
    npx ultragoal --setup      also pre-configure the current repo (with --yes: defaults)
    npx ultragoal uninstall    remove the plugin + marketplace (keeps your repo data)
    npx ultragoal uninstall --purge
                               also delete this repo's .ultragoal/ and CLAUDE.md block

  Wraps Claude Code's native plugin system:
    claude plugin marketplace add ${MARKETPLACE}
    claude plugin install ${PLUGIN} [--scope project]

  Docs: ${DOCS}
`);
  process.exit(0);
}

// ------------------------------------------------------------- uninstall ---
if (args[0] === 'uninstall') {
  banner();
  p.intro(pc.bgMagenta(pc.black(' ultragoal uninstaller ')));

  const us = p.spinner();
  us.start('Removing the plugin');
  const res = claude(['plugin', 'uninstall', PLUGIN]);
  if (res.missing) {
    us.stop(pc.red('Claude Code CLI not found'));
    bail('Nothing to uninstall from.');
  }
  us.stop(res.status === 0 ? 'Plugin removed' : pc.dim('Plugin was not installed'));

  us.start('Removing the marketplace entry');
  const mk = claude(['plugin', 'marketplace', 'remove', MARKETPLACE_NAME]);
  us.stop(mk.status === 0 ? 'Marketplace removed' : pc.dim('Marketplace was not registered'));

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

  p.outro(pc.green('ultragoal is fully uninstalled.') + pc.dim(' Reinstall anytime: npx ultragoal'));
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
};

const FIXED_CORE = `<!-- ultragoal:start — managed block; edit knobs via /ultragoal:setup or by hand -->
## Memory & goals (ultragoal)

- Before substantial work, consult \`.ultragoal/memory/MEMORY.md\` and the relevant topic files. Trust \`[VERIFIED]\` claims; treat \`[READ]\` as only as good as its source and \`[INFERRED]\` as hypotheses to re-check before relying on them.
- When you learn something durable — a confirmed approach, a dead end, an expensive derivation you'd hate to redo — record it per the memory protocol (the \`ultragoal:remember\` skill). Don't save what the repo or git history already records; update entries rather than duplicating.
- When the user corrects you, write it to memory immediately (\`[USER-CORRECTION]\`) — it's the highest-confidence signal there is, and it dies with the session if deferred.
- Memory files are two layers: compiled truth above the \`---\` (rewrite freely), dated evidence log below it (append-only — never edit or delete evidence lines).
- Active goals live in \`.ultragoal/goals/active.md\`. Never check a rubric box without evidence from a command run this session, and never self-certify the VERIFIER item.
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

function writeRepoSetup(root, picks) {
  const ug = join(root, '.ultragoal');
  mkdirSync(join(ug, 'goals', 'archive'), { recursive: true });
  mkdirSync(join(ug, 'memory'), { recursive: true });

  writeFileSync(
    join(ug, 'config.md'),
    `# ultragoal config

Plain markdown, hand-editable. Skills read this file; re-run /ultragoal:setup to change knobs interactively.

| Knob | Value |
|---|---|
| action-mode | ${picks.action} |
| communication | ${picks.communication} |
| scope | ${picks.scope} |
| memory-sharing | ${picks.memory} |
| verification | ${picks.verification} |
| default-budget | 25 |
| verification-cadence | every-claim |
| interview-depth | quick |
`
  );

  for (const [name, content] of Object.entries(MEMORY_FILES)) {
    const f = join(ug, 'memory', name);
    if (!existsSync(f)) writeFileSync(f, content);
  }
  writeFileSync(join(ug, 'goals', 'archive', '.gitkeep'), '');

  // .gitignore entries
  const gi = join(root, '.gitignore');
  const wanted = ['.ultragoal/goals/.turns', '.ultragoal/memory/.sessions'];
  if (picks.memory === 'local') wanted.push('.ultragoal/memory/');
  const existing = existsSync(gi) ? readFileSync(gi, 'utf8') : '';
  const missing = wanted.filter((l) => !existing.includes(l));
  if (missing.length) appendFileSync(gi, `\n# ultragoal local state\n${missing.join('\n')}\n`);

  // CLAUDE.md managed block
  const blocks = [
    FIXED_CORE,
    KNOBS.action.blocks[picks.action],
    KNOBS.communication.blocks[picks.communication],
    KNOBS.scope.blocks[picks.scope],
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

// 1. Claude Code present?
const s = p.spinner();
s.start('Checking for Claude Code');
const probe = claude(['--version']);
if (probe.missing) {
  s.stop(pc.red('Claude Code CLI not found'));
  bail('Install Claude Code first: https://claude.com/claude-code');
}
s.stop(`Claude Code ${pc.dim((probe.stdout || '').trim().split(' ')[0] || 'found')}`);

// 2. Scope — project by default; --global opts into machine-wide install
let scope = flag('--global') ? 'user' : 'project';
if (interactive && !flag('--project') && !flag('--global')) {
  const pick = await p.select({
    message: 'Where should it be installed?',
    options: [
      { value: 'project', label: 'Only this project', hint: 'recommended — written to .claude/settings.json, teammates get it via git' },
      { value: 'user', label: 'Globally', hint: 'every project on this machine' },
    ],
  });
  if (p.isCancel(pick)) bail('Cancelled.');
  scope = pick;
}

// 3. Marketplace + plugin
s.start('Adding the ultragoal marketplace');
const add = claude(['plugin', 'marketplace', 'add', MARKETPLACE]);
if (add.status !== 0) claude(['plugin', 'marketplace', 'update', MARKETPLACE_NAME]);
s.stop('Marketplace ready');

s.start('Installing the plugin');
let res = claude(['plugin', 'install', PLUGIN, '--scope', scope]);
if (res.status !== 0) res = claude(['plugin', 'update', PLUGIN]);
if ((res.status ?? 1) !== 0) {
  s.stop(pc.red('Install failed'));
  bail(`Try the manual route:\n  claude plugin marketplace add ${MARKETPLACE}\n  claude plugin install ${PLUGIN}`);
}
s.stop(`Plugin installed ${pc.dim(`(${scope} scope)`)}`);

// 4. Optional repo pre-configuration
let didSetup = false;
const root = process.cwd();
const alreadySetup = existsSync(join(root, '.ultragoal'));
let wantSetup = flag('--setup');
if (interactive && !alreadySetup && !wantSetup) {
  const yn = await p.confirm({
    message: 'Pre-configure this repo now? (picks your working style, scaffolds .ultragoal/ — ~30s)',
    initialValue: false,
  });
  if (p.isCancel(yn)) bail('Cancelled.');
  wantSetup = yn;
}

if (wantSetup && !alreadySetup) {
  const picks = { action: 'proactive', communication: 'lead-with-outcome', scope: 'elaborate-ok', memory: 'git', verification: 'on' };
  if (interactive) {
    for (const key of ['action', 'communication', 'scope', 'memory', 'verification']) {
      const v = await p.select({ message: KNOBS[key].question, options: KNOBS[key].options });
      if (p.isCancel(v)) bail('Cancelled.');
      picks[key] = v;
    }
  }
  writeRepoSetup(root, picks);
  didSetup = true;
  p.note(
    `.ultragoal/config.md      your knobs (hand-editable)\n.ultragoal/memory/        two-layer memory, ready to grow\nCLAUDE.md                  ultragoal block ${pc.dim('(marked, easy to remove)')}`,
    'Created in this repo'
  );
} else if (alreadySetup) {
  p.log.info('This repo already has .ultragoal/ — leaving it untouched.');
}

p.outro(
  `${pc.green('ultragoal is ready.')} Open Claude Code and describe what you want:\n\n` +
    `  ${pc.cyan('/ultragoal:goal')} ${pc.dim('<your messy brain dump — a raw voice transcript is fine>')}\n\n` +
    `${didSetup ? '' : pc.dim('First goal in a repo asks 5 quick style questions (or run npx ultragoal --setup).\n')}` +
    pc.dim(`Docs: ${DOCS}`)
);
