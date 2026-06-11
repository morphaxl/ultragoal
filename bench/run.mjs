#!/usr/bin/env node
// ultragoal bench runner — measures the ultragoal harness against vanilla Claude Code.
//
// Design contract (see docs/research/harness-eval-2026-06.md):
//   - pristine mkdtemp sandbox per run, seeded from scratch; grader lives here, never in the sandbox
//   - identical brief, model, sandbox, and grader per task across arms; only the harness varies
//   - vanilla arm: stock `claude -p "<brief>"` (no .ultragoal in sandbox -> plugin hooks are no-ops)
//   - ultragoal arm: `claude --plugin-dir <this repo> -p "/ultragoal:goal <brief>"` (pinned working copy)
//   - one TSV row per completed run; infrastructure failures produce NO row (re-run them instead)
//
// Modes:
//   node bench/run.mjs --selftest                 validate every task: check FAILS on seed, PASSES on reference fix
//   node bench/run.mjs --smoke                    1 task x 2 arms x 1 rep -> bench/results/smoke.tsv
//   node bench/run.mjs --baseline                 all tasks x 2 arms x 3 reps -> bench/results/baseline.tsv
//   node bench/run.mjs --measure                  FROZEN cost metric: ultragoal arm x all tasks x 1 rep;
//                                                 prints `MEASURE mean_tokens=<N> solved=<k>/3 loop=<k>/3`
//                                                 (loop = sandbox finished with a hash-bound verified PASS)
//   node bench/run.mjs --task <t> --arm <a> --rep <n> [--out <tsv>]   single run (for re-running crashes)
// Options: --parallel <n> (default 2), --timeout-min <m> (default 25), --reps <n> (default 3), --keep

import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BENCH = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(BENCH);
const TASKS_DIR = join(BENCH, 'tasks');
const RESULTS = join(BENCH, 'results');
const LOGS = join(RESULTS, 'logs');
const HEADER = 'task\tarm\tpasses\tchecks\tturns\ttokens\tmodel\tharness_commit\n';
const ARMS = ['vanilla', 'ultragoal'];

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const flag = (name) => args.includes(`--${name}`);
const PARALLEL = Number(opt('parallel', 2));
const TIMEOUT_MS = Number(opt('timeout-min', 25)) * 60_000;
const REPS = Number(opt('reps', 3));
const KEEP = flag('keep');

const sh = (cmd, a, opts = {}) => spawnSync(cmd, a, { encoding: 'utf8', ...opts });
const tasks = () => readdirSync(TASKS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const commit = () => sh('git', ['-C', REPO, 'rev-parse', '--short', 'HEAD']).stdout.trim();

function makeSandbox(task) {
  const box = mkdtempSync(join(tmpdir(), `ugbench-${task}-`));
  const seeded = sh('bash', [join(TASKS_DIR, task, 'seed.sh'), box]);
  if (seeded.status !== 0) throw new Error(`seed failed for ${task}: ${seeded.stderr}`);
  for (const [c, a] of [
    ['git', ['-C', box, 'init', '-q']],
    ['git', ['-C', box, '-c', 'user.email=bench@ultragoal', '-c', 'user.name=bench', 'add', '-A']],
    ['git', ['-C', box, '-c', 'user.email=bench@ultragoal', '-c', 'user.name=bench', 'commit', '-q', '-m', 'seed']],
  ]) {
    const r = sh(c, a);
    if (r.status !== 0) throw new Error(`sandbox git setup failed: ${r.stderr}`);
  }
  return box;
}

function runCheck(task, box) {
  const r = sh('bash', [join(TASKS_DIR, task, 'check.sh'), box]);
  const m = (r.stdout || '').match(/CHECKS (\d+)\/(\d+)/);
  if (!m) throw new Error(`grader emitted no CHECKS line for ${task}: ${r.stderr}`);
  return { passes: Number(m[1]), checks: Number(m[2]), detail: r.stderr.trim() };
}

function selftest() {
  let ok = true;
  for (const task of tasks()) {
    const box = makeSandbox(task);
    const onSeed = runCheck(task, box);
    const failsOnSeed = onSeed.passes < onSeed.checks;
    const ref = sh('bash', [join(TASKS_DIR, task, 'reference.sh'), box]);
    const afterRef = ref.status === 0 ? runCheck(task, box) : { passes: -1, checks: 0 };
    const passesOnRef = afterRef.passes === afterRef.checks && afterRef.checks > 0;
    if (!KEEP) rmSync(box, { recursive: true, force: true });
    if (failsOnSeed && passesOnRef) {
      console.log(`SELFTEST ${task} PASS (seed ${onSeed.passes}/${onSeed.checks} fails, reference ${afterRef.passes}/${afterRef.checks} passes)`);
    } else {
      ok = false;
      console.error(`SELFTEST ${task} FAIL (seed ${onSeed.passes}/${onSeed.checks} must fail; reference ${afterRef.passes}/${afterRef.checks} must fully pass)`);
    }
  }
  process.exit(ok ? 0 : 1);
}

function claudeArgs(arm, brief) {
  const base = ['--dangerously-skip-permissions', '--output-format', 'json'];
  return arm === 'ultragoal'
    ? ['--plugin-dir', REPO, ...base, '-p', `/ultragoal:goal ${brief}`]
    : [...base, '-p', brief];
}

function runAgent(arm, brief, box, logBase) {
  return new Promise((resolve) => {
    const child = spawn('claude', claudeArgs(arm, brief), { cwd: box, env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); err += '\n[bench] timeout, killed'; }, TIMEOUT_MS);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => {
      clearTimeout(timer);
      writeFileSync(`${logBase}.out.json`, out);
      writeFileSync(`${logBase}.err.log`, err);
      resolve({ code, out });
    });
  });
}

function parseResult(out) {
  // --output-format json prints a single result object on stdout.
  const text = out.trim();
  const start = text.indexOf('{');
  if (start < 0) return null;
  try {
    const j = JSON.parse(text.slice(start));
    const u = j.usage || {};
    const tokens = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
    const model = j.modelUsage ? Object.keys(j.modelUsage).join('+') : '';
    return { turns: j.num_turns ?? -1, tokens, model, cost: j.total_cost_usd ?? null, subtype: j.subtype || '' };
  } catch {
    return null;
  }
}

async function oneRun(task, arm, rep, outFile) {
  const brief = sh('cat', [join(TASKS_DIR, task, 'brief.txt')]).stdout.trim();
  const box = makeSandbox(task);
  // suite-prefixed so different suites never clobber each other's raw logs
  const suite = (outFile.split('/').pop() || 'run').replace(/\.tsv$/, '');
  const logBase = join(LOGS, `${suite}-${task}-${arm}-r${rep}`);
  const label = `${task}/${arm}/r${rep}`;
  console.log(`[bench] start ${label} (sandbox ${box})`);
  const t0 = Date.now();
  const { out } = await runAgent(arm, brief, box, logBase);
  const meta = parseResult(out);
  if (!meta) {
    console.error(`[bench] ERROR ${label}: no parseable result JSON (see ${logBase}.err.log) — no row written`);
    if (!KEEP) rmSync(box, { recursive: true, force: true });
    return false;
  }
  let graded;
  try {
    graded = runCheck(task, box);
  } catch (e) {
    console.error(`[bench] ERROR ${label}: grader failed: ${e.message} — no row written`);
    if (!KEEP) rmSync(box, { recursive: true, force: true });
    return false;
  }
  // loop integrity (ultragoal arm): the sandbox's goal must carry a hash-bound verified PASS —
  // guards the cost metric against "optimizations" that delete verification itself
  let loopOk = false;
  if (arm === 'ultragoal') {
    loopOk = sh('grep', ['-rl', 'ULTRAGOAL-VERIFIED: PASS rubric=', join(box, '.ultragoal', 'goals')]).status === 0;
  }
  appendFileSync(outFile, `${task}\t${arm}\t${graded.passes}\t${graded.checks}\t${meta.turns}\t${meta.tokens}\t${meta.model}\t${commit()}\n`);
  console.log(`[bench] done ${label}: ${graded.passes}/${graded.checks} checks, ${meta.turns} turns, ${meta.tokens} tokens, ${((Date.now() - t0) / 60000).toFixed(1)}m${arm === 'ultragoal' ? ` loop=${loopOk ? 'ok' : 'MISSING'}` : ''}${graded.detail ? ` | ${graded.detail.split('\n').join('; ')}` : ''}`);
  if (!KEEP) rmSync(box, { recursive: true, force: true });
  return { ok: true, passes: graded.passes, checks: graded.checks, tokens: meta.tokens, loopOk };
}

async function pool(jobs, width) {
  const results = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(width, jobs.length) }, async () => {
    while (i < jobs.length) { const j = jobs[i++]; results.push(await j()); }
  }));
  return results;
}

async function suite(taskList, reps, outFile) {
  mkdirSync(LOGS, { recursive: true });
  if (!existsSync(outFile)) writeFileSync(outFile, HEADER);
  const jobs = [];
  for (let rep = 1; rep <= reps; rep++) {
    for (const task of taskList) {
      for (const arm of ARMS) jobs.push(() => oneRun(task, arm, rep, outFile));
    }
  }
  const results = await pool(jobs, PARALLEL);
  const okCount = results.filter(Boolean).length;
  console.log(`[bench] suite complete: ${okCount}/${jobs.length} runs recorded -> ${outFile}`);
  process.exit(okCount === jobs.length ? 0 : 1);
}

async function measure() {
  mkdirSync(LOGS, { recursive: true });
  const outFile = join(RESULTS, `measure-${commit()}-${Date.now()}.tsv`);
  writeFileSync(outFile, HEADER);
  const all = tasks();
  const results = (await pool(all.map((task) => () => oneRun(task, 'ultragoal', 1, outFile)), PARALLEL)).filter((r) => r && r.ok);
  if (results.length !== all.length) {
    console.log(`MEASURE ERROR incomplete (${results.length}/${all.length} runs finished — re-run)`);
    process.exit(1);
  }
  const mean = Math.round(results.reduce((a, r) => a + r.tokens, 0) / results.length);
  const solved = results.filter((r) => r.passes === r.checks).length;
  const loop = results.filter((r) => r.loopOk).length;
  console.log(`MEASURE mean_tokens=${mean} solved=${solved}/${all.length} loop=${loop}/${all.length}`);
  process.exit(0);
}

if (flag('selftest')) {
  selftest();
} else if (flag('smoke')) {
  await suite([tasks()[0]], 1, join(RESULTS, 'smoke.tsv'));
} else if (flag('baseline')) {
  await suite(tasks(), REPS, join(RESULTS, 'baseline.tsv'));
} else if (flag('measure')) {
  await measure();
} else if (opt('task', null) && opt('arm', null)) {
  mkdirSync(LOGS, { recursive: true });
  const outFile = opt('out', join(RESULTS, 'baseline.tsv'));
  if (!existsSync(outFile)) writeFileSync(outFile, HEADER);
  const ok = await oneRun(opt('task', null), opt('arm', null), Number(opt('rep', 1)), outFile);
  process.exit(ok ? 0 : 1);
} else {
  console.error('usage: run.mjs --selftest | --smoke | --baseline | --measure | --task <t> --arm <vanilla|ultragoal> --rep <n>');
  process.exit(2);
}
