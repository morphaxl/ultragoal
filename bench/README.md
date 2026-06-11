# bench — ultragoal's self-measurement instrument

Measures the ultragoal harness against vanilla Claude Code on seeded tasks, graded by identical scripted end-state checks. Methodology and sources: [docs/research/harness-eval-2026-06.md](../docs/research/harness-eval-2026-06.md). A full baseline has not been recorded yet (the owner deprioritized measured self-experiments — partial honest data lives in `results/`); when one is run, summarize it in a `BASELINE.md` here per the reporting rules below.

## Re-run the baseline

```bash
node bench/run.mjs --selftest     # validate tasks first: every check must fail on seed, pass on reference
node bench/run.mjs --baseline     # 3 tasks × 2 arms × 3 reps = 18 headless agent runs -> bench/results/baseline.tsv
```

Each run is a full autonomous agent session (≈1–25 min); the suite runs 2 in parallel by default (`--parallel N`). A crashed run writes no row — re-run that cell with `node bench/run.mjs --task <t> --arm <vanilla|ultragoal> --rep <n>`. Per-run raw result JSON and stderr land in `bench/results/logs/`.

## Methodology, in brief

- **Two arms, one variable.** Identical brief, sandbox, model, and grader per task; only the harness differs. Vanilla: stock `claude -p "<brief>"` (the sandbox has no `.ultragoal`, so installed plugin hooks are no-ops). Ultragoal: `claude --plugin-dir <this repo> -p "/ultragoal:goal <brief>"` — the goal loop, gate, and verifier of the checked-out commit, in native form.
- **Pristine environment per rep.** Every run seeds a fresh temp sandbox; nothing is reused.
- **Validated tasks.** `--selftest` enforces fail-to-pass: each grader must fail on the seeded repo and fully pass after the task's known-good `reference.sh` — a check that can't do both is a broken task, not a measurement.
- **Graders stay outside the sandbox.** Agents never see `check.sh`; checks are deterministic end-state assertions (no LLM judging) and include must-NOT items (unchanged outputs, intact interfaces).
- **Cost beside accuracy.** Every row records checks passed, turns, and total tokens processed (input + output + cache creation + cache reads, from `--output-format json` usage); per-run cost lives in the raw logs.
- **Honest small-N reporting.** 18 runs detect only large effects: BASELINE.md reports all raw outcomes, per-arm Wilson/Beta intervals, per-task direction and 3/3-consistency (pass^k) — no CLT/bootstrap error bars, no p-values.

## Anatomy of a task

```
bench/tasks/<name>/
  seed.sh        # writes the sandbox repo (planted defect or missing feature)
  brief.txt      # the identical prompt both arms receive
  check.sh       # grader: `bash check.sh <sandbox>` prints "CHECKS p/t", exit 0 iff all pass
  reference.sh   # known-good fix, used only by --selftest to prove solvability
```

Adding a task = adding such a directory; `--selftest` is the admission gate. Tasks are freshly authored for this bench (never copied from public repos) to avoid training-data contamination.
