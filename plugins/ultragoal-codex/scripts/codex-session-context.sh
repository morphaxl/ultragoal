#!/usr/bin/env sh
# Prints lightweight Ultragoal context for Codex SessionStart hooks. Fail-open.

d="${PWD:-.}"
ROOT=""
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d=$(dirname "$d")
done
[ -n "$ROOT" ] || exit 0

UG="$ROOT/.ultragoal"
[ -d "$UG" ] || exit 0

read_field() {
  sed -n "s/^$2:[[:space:]]*//p" "$1" 2>/dev/null | head -1 | tr -d '[:space:]'
}

printed=0
for base in "$UG/goals/active" "$UG/codex-goals"; do
  [ -d "$base" ] || continue
  for gf in "$base"/*/goal.md; do
    [ -r "$gf" ] || continue
    [ "$(read_field "$gf" status)" = "active" ] || continue
    if [ "$printed" -eq 0 ]; then
      echo "<ultragoal-codex-context>"
      printed=1
    fi
    slug=$(read_field "$gf" slug); [ -n "$slug" ] || slug=$(basename "$(dirname "$gf")")
    turns=0
    [ -r "$(dirname "$gf")/.turns" ] && turns=$(tr -dc '0-9' < "$(dirname "$gf")/.turns" 2>/dev/null)
    budget=$(read_field "$gf" budget); [ -n "$budget" ] || budget=25
    echo "ACTIVE ULTRAGOAL: \"$slug\" turn ${turns:-0}/$budget in $gf. Continue from unchecked rubric items and do not finish until verifier/panel PASS is recorded."
  done
done

if [ "$printed" -eq 1 ]; then
  echo "</ultragoal-codex-context>"
fi
