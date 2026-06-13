#!/usr/bin/env bash
# ultragoal goal-log monitor — runs as a plugin background monitor (started on
# first /ultragoal:goal invocation, interactive sessions only).
#
# Convention: workers capture long-running process output (dev servers, builds,
# watchers) to .ultragoal/goals/active/<slug>/logs/<name>.log. This monitor
# polls those files and emits only NEW lines that look like signal (errors,
# warnings, failures), capped per tick. It is the alarm bell, not the firehose —
# the full log stays on disk for grep.
#
# Rigor-gated: this is a "standard"/"max" tier amenity. When rigor=vanilla (the
# default, for strong models), the monitor self-disables — vanilla adds nothing.
#
# Invariant: FAIL QUIET. Any problem = print nothing, keep polling. This
# process must never spam the session or die noisily.

INTERVAL=5
MAX_LINES_PER_TICK=12
SIGNAL_RE='error|fail|fatal|panic|exception|warn|assert|timeout|denied|refused|unhandled'

# ---- locate the .ultragoal root (walk up, same as the gate) -----------------
start="${CLAUDE_PROJECT_DIR:-$PWD}"
ROOT="$start"
d="$start"
while [ -n "$d" ] && [ "$d" != "/" ] && [ "$d" != "$HOME" ]; do
  if [ -d "$d/.ultragoal" ]; then ROOT="$d"; break; fi
  d="$(dirname "$d")"
done
UG="$ROOT/.ultragoal"
ACTIVE="$UG/goals/active"

# ---- rigor gate: only standard/max run the monitor; vanilla self-disables ----
# Default (missing config or unset knob) is vanilla → exit. The monitor wakes
# only when the user has explicitly opted into a higher tier.
rigor="$(sed -n 's/^| *rigor *|//p' "$UG/config.md" 2>/dev/null | head -1 | tr -d ' |')"
case "$rigor" in
  standard|max) ;;
  *) exit 0 ;;
esac

STATE="$(mktemp -d 2>/dev/null)" || exit 0
trap 'rm -rf "$STATE"' EXIT INT TERM

while :; do
  if [ -d "$ACTIVE" ]; then
    for f in "$ACTIVE"/*/logs/*.log; do
      [ -r "$f" ] || continue
      key="$(printf '%s' "$f" | cksum 2>/dev/null | tr ' ' '_')"
      off=0
      [ -r "$STATE/$key" ] && off="$(tr -dc '0-9' < "$STATE/$key" 2>/dev/null)"
      case "$off" in '') off=0 ;; esac
      total="$(wc -l < "$f" 2>/dev/null | tr -d '[:space:]')"
      case "$total" in '' | *[!0-9]*) continue ;; esac
      [ "$total" -lt "$off" ] && off=0   # file truncated or rotated — restart
      if [ "$total" -gt "$off" ]; then
        slug="$(basename "$(dirname "$(dirname "$f")")")"
        tail -n "+$((off + 1))" "$f" 2>/dev/null | head -n 400 \
          | grep -iE "$SIGNAL_RE" 2>/dev/null \
          | head -n "$MAX_LINES_PER_TICK" \
          | cut -c1-300 \
          | sed "s|^|[$slug/$(basename "$f")] |" 2>/dev/null
        printf '%s' "$total" > "$STATE/$key" 2>/dev/null || true
      fi
    done
  fi
  sleep "$INTERVAL"
done
