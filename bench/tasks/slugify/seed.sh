#!/usr/bin/env bash
# Seeds the slugify task into $1: a naive happy-path implementation plus the full spec it violates.
set -eu
S="$1"

cat > "$S/slugify.mjs" <<'EOF'
// slugify — turn titles into URL slugs. Contract: SPEC.md.
export default function slugify(title) {
  return title.toLowerCase().replace(/ /g, '-');
}
EOF

cat > "$S/SPEC.md" <<'EOF'
# slugify(title) contract

For ANY string input, slugify must return a slug such that:

1. Lowercase ASCII letters, digits, and single dashes only — nothing else ever appears in the output.
2. Accented and decomposable characters are transliterated to their base ASCII letter (é→e, ü→u, ñ→n) via Unicode NFKD; characters with no ASCII base are dropped.
3. Every maximal run of non-alphanumeric characters (spaces, punctuation, symbols, underscores) becomes exactly one dash.
4. No leading or trailing dashes.
5. Empty input, or input with no representable characters at all, returns "untitled".
6. Results longer than 60 characters are truncated at the last dash boundary at or before 60, never mid-word, and never end with a dash. If the first word alone exceeds 60 characters, hard-truncate it at 60.
7. Idempotent: slugify(slugify(x)) === slugify(x).

Examples: "Hello, World!" → "hello-world" · "Crème brûlée: a study" → "creme-brulee-a-study" · "  --- " → "untitled"
EOF

cat > "$S/README.md" <<'EOF'
URL slug generator used by our static site pipeline. `slugify.mjs` is the implementation; `SPEC.md` is the contract it must satisfy.
EOF
