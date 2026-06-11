#!/usr/bin/env bash
# Known-good fix, used only by run.mjs --selftest to prove the task is solvable.
set -eu
S="$1"
cat > "$S/todo.mjs" <<'EOF'
// todo — a tiny task list CLI. Commands: add <text...>, list [--json], done <id>.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DB = new URL('.todos.json', import.meta.url).pathname;
const load = () => (existsSync(DB) ? JSON.parse(readFileSync(DB, 'utf8')) : []);
const save = (todos) => writeFileSync(DB, JSON.stringify(todos, null, 2));

const [, , cmd, ...rest] = process.argv;

if (cmd === 'add') {
  const todos = load();
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1;
  todos.push({ id, text: rest.join(' '), done: false });
  save(todos);
  console.log(`added ${id}`);
} else if (cmd === 'list') {
  const todos = load().slice().sort((a, b) => a.id - b.id);
  if (rest.includes('--json')) {
    console.log(JSON.stringify(todos.map(({ id, text, done }) => ({ id, text, done }))));
  } else {
    for (const t of todos) {
      console.log(`[${t.done ? 'x' : ' '}] ${t.id}: ${t.text}`);
    }
  }
} else if (cmd === 'done') {
  const todos = load();
  const t = todos.find((t) => t.id === Number(rest[0]));
  if (!t) { console.error(`no todo ${rest[0]}`); process.exit(1); }
  t.done = true;
  save(todos);
  console.log(`done ${t.id}`);
} else {
  console.error('usage: todo <add|list|done>');
  process.exit(2);
}
EOF
