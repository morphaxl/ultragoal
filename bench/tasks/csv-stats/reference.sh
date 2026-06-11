#!/usr/bin/env bash
# Known-good fix, used only by run.mjs --selftest to prove the task is solvable.
set -eu
S="$1"
cat > "$S/csvstats.mjs" <<'EOF'
export function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  const header = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()));
  return { header, rows };
}

export function columnStats({ header, rows }) {
  const stats = {};
  header.forEach((name, i) => {
    const vals = rows
      .map((r) => r[i])
      .filter((c) => c !== undefined && c !== '')
      .map(Number);
    if (vals.length === 0) {
      stats[name] = { min: null, max: null, mean: null };
      return;
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    stats[name] = { min: Math.min(...vals), max: Math.max(...vals), mean: sum / vals.length };
  });
  return stats;
}
EOF
