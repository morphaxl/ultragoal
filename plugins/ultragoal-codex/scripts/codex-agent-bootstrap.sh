#!/usr/bin/env sh
# Link bundled Ultragoal Codex custom agents into Codex home.
#
# Codex currently loads custom agents from ~/.codex/agents or .codex/agents.
# Plugin manifests expose hooks and skills, but not agent TOML files, so this
# SessionStart hook performs an idempotent copy. It never changes permissions,
# sandbox settings, auth, or other Codex config.

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" 2>/dev/null && pwd -P) || exit 0
PLUGIN_ROOT=$(dirname "$SCRIPT_DIR")
SRC="$PLUGIN_ROOT/agents"
[ -d "$SRC" ] || exit 0

CODEX_DIR="${CODEX_HOME:-$HOME/.codex}"
[ -n "$CODEX_DIR" ] || exit 0
DEST="$CODEX_DIR/agents"
mkdir -p "$DEST" 2>/dev/null || exit 0

changed=0
for src in "$SRC"/ultragoal-*.toml; do
  [ -r "$src" ] || continue
  name=$(basename "$src")
  dest="$DEST/$name"
  if [ ! -r "$dest" ] || ! cmp -s "$src" "$dest" 2>/dev/null; then
    cp "$src" "$dest" 2>/dev/null || continue
    changed=$((changed + 1))
  fi
done

if [ "$changed" -gt 0 ]; then
  cat <<EOF
<ultragoal-codex-context>
Ultragoal Codex custom agents linked into $DEST. Available roles include ultragoal-executor and ultragoal-verifier; restart Codex if this is the first time they were installed.
</ultragoal-codex-context>
EOF
fi
