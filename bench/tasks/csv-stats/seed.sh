#!/usr/bin/env bash
# Seeds the csv-stats task into $1 (sandbox dir). Plants three realistic stat bugs.
set -eu
S="$1"

cat > "$S/csvstats.mjs" <<'EOF'
// csvstats — tiny CSV column statistics. See USAGE.md for the contract.
export function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const header = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()));
  return { header, rows };
}

export function columnStats({ header, rows }) {
  const stats = {};
  header.forEach((name, i) => {
    const vals = rows.map((r) => Number(r[i]));
    const sum = vals.reduce((a, b) => a + b, 0);
    stats[name] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
      mean: sum / (vals.length - 1),
    };
  });
  return stats;
}
EOF

cat > "$S/USAGE.md" <<'EOF'
# csvstats

`parseCSV(text)` -> `{ header, rows }`; `columnStats({header, rows})` -> per-column `{min, max, mean}`.

Contract:
- Empty cells and missing cells (short rows) are ABSENT values: excluded from min/max/mean entirely — never treated as 0 or NaN.
- A column with no present values has `{min: null, max: null, mean: null}`.
- mean is the arithmetic mean of present values.

Worked example — this exact input:

```
qty,price
2,10
,20
4,
```

must produce exactly:

```
qty:   min 2, max 4, mean 3
price: min 10, max 20, mean 15
```
EOF

cat > "$S/demo.mjs" <<'EOF'
import { parseCSV, columnStats } from './csvstats.mjs';
const text = 'qty,price\n2,10\n,20\n4,\n';
console.log(JSON.stringify(columnStats(parseCSV(text)), null, 2));
EOF

cat > "$S/README.md" <<'EOF'
Tiny CSV stats library. Run `node demo.mjs` to see current output. The behavior contract lives in USAGE.md.
EOF
