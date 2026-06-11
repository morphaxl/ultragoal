#!/usr/bin/env bash
# End-state grader for todo-json. Usage: bash check.sh <sandbox>. Prints "CHECKS p/t", exits 0 iff p==t.
set -u
S="$1"
node --input-type=module - "$S" <<'EOF'
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
const sandbox = process.argv[2];
let pass = 0, total = 0;
const t = (name, fn) => { total++; try { if (fn()) { pass++; } else { console.error(`fail: ${name}`); } } catch (e) { console.error(`fail: ${name} (${e.message})`); } };
const todo = (...args) => execFileSync('node', [`${sandbox}/todo.mjs`, ...args], { cwd: sandbox, encoding: 'utf8' });
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

rmSync(`${sandbox}/.todos.json`, { force: true });

// JSON.parse rejects trailing garbage, so a successful parse also proves "nothing else on stdout".
t('--json on empty list is []', () => eq(JSON.parse(todo('list', '--json')), []));
todo('add', 'buy milk');
todo('add', 'ship bench');
todo('done', '1');
t('--json shape and id order', () => eq(JSON.parse(todo('list', '--json')), [{ id: 1, text: 'buy milk', done: true }, { id: 2, text: 'ship bench', done: false }]));
t('must-NOT: human list unchanged', () => todo('list') === '[x] 1: buy milk\n[ ] 2: ship bench\n');
t('must-NOT: add output unchanged', () => todo('add', 'third') === 'added 3\n');
t('must-NOT: done output unchanged', () => todo('done', '3') === 'done 3\n');
t('--json reflects later changes', () => eq(JSON.parse(todo('list', '--json'))[2], { id: 3, text: 'third', done: true }));
t('must-NOT: unknown command exits 2', () => { try { execFileSync('node', [`${sandbox}/todo.mjs`, 'bogus'], { cwd: sandbox, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }); return false; } catch (e) { return e.status === 2; } });

console.log(`CHECKS ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
EOF
