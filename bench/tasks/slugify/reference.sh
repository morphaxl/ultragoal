#!/usr/bin/env bash
# Known-good fix, used only by run.mjs --selftest to prove the task is solvable.
set -eu
S="$1"
cat > "$S/slugify.mjs" <<'EOF'
// slugify — turn titles into URL slugs. Contract: SPEC.md.
export default function slugify(title) {
  let s = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s === '') return 'untitled';
  if (s.length > 60) {
    const cut = s.lastIndexOf('-', 60);
    s = cut > 0 ? s.slice(0, cut) : s.slice(0, 60);
    s = s.replace(/-+$/g, '');
  }
  return s;
}
EOF
