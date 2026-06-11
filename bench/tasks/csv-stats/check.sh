#!/usr/bin/env bash
# End-state grader for csv-stats. Usage: bash check.sh <sandbox>. Prints "CHECKS p/t", exits 0 iff p==t.
set -u
S="$1"
node --input-type=module - "$S" <<'EOF'
const sandbox = process.argv[2];
let pass = 0, total = 0;
const t = (name, fn) => { total++; try { if (fn()) { pass++; } else { console.error(`fail: ${name}`); } } catch (e) { console.error(`fail: ${name} (${e.message})`); } };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { parseCSV, columnStats } = await import(`${sandbox}/csvstats.mjs`);
const stats = (text) => columnStats(parseCSV(text));

t('exports intact', () => typeof parseCSV === 'function' && typeof columnStats === 'function');
t('documented example exact', () => eq(stats('qty,price\n2,10\n,20\n4,\n'), { qty: { min: 2, max: 4, mean: 3 }, price: { min: 10, max: 20, mean: 15 } }));
t('plain mean correct', () => eq(stats('a\n1\n2\n3\n').a, { min: 1, max: 3, mean: 2 }));
t('single row', () => eq(stats('a\n5\n').a, { min: 5, max: 5, mean: 5 }));
t('negatives', () => eq(stats('a\n-2\n-8\n').a, { min: -8, max: -2, mean: -5 }));
t('short rows excluded', () => eq(stats('a,b\n1,7\n2\n').b, { min: 7, max: 7, mean: 7 }));
t('all-empty column null', () => eq(stats('a,b\n1,\n2,\n').b, { min: null, max: null, mean: null }));
t('empty not zero', () => stats('a\n10\n\n,\n').a.min === 10);

const usage = await import('node:fs').then((fs) => fs.readFileSync(`${sandbox}/USAGE.md`, 'utf8'));
t('must-NOT: USAGE.md unmodified', () => usage.includes('must produce exactly') && usage.includes('qty:   min 2, max 4, mean 3'));

console.log(`CHECKS ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
EOF
