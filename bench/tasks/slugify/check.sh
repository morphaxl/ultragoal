#!/usr/bin/env bash
# End-state grader for slugify. Usage: bash check.sh <sandbox>. Prints "CHECKS p/t", exits 0 iff p==t.
set -u
S="$1"
node --input-type=module - "$S" <<'EOF'
const sandbox = process.argv[2];
let pass = 0, total = 0;
const t = (name, fn) => { total++; try { if (fn()) { pass++; } else { console.error(`fail: ${name}`); } } catch (e) { console.error(`fail: ${name} (${e.message})`); } };

const mod = await import(`${sandbox}/slugify.mjs`);
const slug = mod.default;

t('interface: default export, arity 1', () => typeof slug === 'function');
t('happy path', () => slug('Hello World') === 'hello-world');
t('punctuation collapses', () => slug('Hello, World!') === 'hello-world');
t('accents transliterate', () => slug('Crème brûlée: a study') === 'creme-brulee-a-study');
t('separator runs collapse', () => slug('a -- b __ c') === 'a-b-c');
t('no leading/trailing dashes', () => slug('  ...big news!  ') === 'big-news');
t('empty -> untitled', () => slug('') === 'untitled');
t('symbols-only -> untitled', () => slug('  --- ') === 'untitled');
t('charset clean on hostile input', () => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug('C++ & C# (2026 edition)')));
t('length cap at dash boundary', () => { const s = slug('word '.repeat(30)); return s.length <= 60 && !s.endsWith('-') && /^[a-z0-9-]+$/.test(s) && 'word-'.repeat(30).startsWith(s + '-'); });
t('long single word hard-truncates', () => slug('x'.repeat(80)).length === 60);
t('idempotent', () => { const s = slug('Crème brûlée: a study'); return slug(s) === s; });

console.log(`CHECKS ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
EOF
