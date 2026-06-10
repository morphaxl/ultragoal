---
slug: rubric-library
status: done
kind: task
budget: 18
session: e894758b-8746-4b0c-a91a-4733ac28dccc
verify: on
created: 2026-06-10
---

# Objective
Build a research-backed rubric library (~14 domain templates) that the goal skill consults when a brief matches a domain — the "rubric design is the skill" content moat. Every threshold sourced from authoritative references, every item checkable by a command, and templates recommend relevant Claude Code skills (e.g., frontend-design for UI work). Ship v0.8.0.

# Context
Owner picked all domains: web stack (Next.js/React feature, frontend design, web perf, a11y, API, auth/security), universal (bug fix, refactor/migration, test health, build/CI speedup, dep upgrade, CLI, docs), mobile RN. Mid-flight addition from owner: templates should encourage using matching available skills (frontend-design, ui-ux-pro-max, etc.) — phrased as "if available" since skill sets vary per user. Library lives in skills/goal/rubrics/ (supporting files, loaded on demand).

# Rubric
- [x] skills/goal/rubrics/INDEX.md lists ≥14 templates, each with a one-line "use when" — check: grep -c '\.md' INDEX entries ≥14
- [x] ≥14 template files exist in skills/goal/rubrics/ — check: ls | wc -l
- [x] Every rubric line in every template carries a check — check: no `- [ ]` line in rubrics/*.md lacks "— check:" (lint grep exits clean)
- [x] Every template has Stop conditions and a Sources section with ≥2 authoritative references — check: grep -L counts are zero for both patterns
- [x] Templates recommend relevant skills where applicable — check: grep -l "Skills:" matches the design/frontend/mobile/docs templates at minimum
- [x] Goal skill Phase 3 instructs consulting rubrics/INDEX.md and using matching available skills — check: grep "rubrics/INDEX" and grep -i "available skills" in skills/goal/SKILL.md
- [x] README mentions the rubric library — check: grep -i "rubric library" README.md
- [x] bash tests/gate-test.sh exits 0 and claude plugin validate . passes
- [x] v0.8.0 in plugin.json + package.json, committed, pushed, git status clean
- [x] VERIFIER: independent sign-off recorded below

# Stop conditions
- 18 turns reached, or any item fails verification 3 consecutive times

# Constraints
- Thresholds come from the cited research (Core Web Vitals, WCAG 2.2, OWASP, official tool docs), never invented
- No behavior change beyond the library + goal-skill wiring + README
- Commit messages mention no AI tooling

# Verification log

# Decision journal
- Verifier flagged (2nd occurrence of known pattern): rubric item 5's literal check `grep -l "Skills:"` didn't match the final heading "## Skills to pair" — substance verified, check text left unedited to keep the verdict's hash binding intact.
- Lint design choice: the VERIFIER rubric line is exempt from the check-command requirement — its check IS the verifier protocol.

# Native fallback
/goal all rubric items in .ultragoal/goals/active.md are checked with evidence and the last verification line is a PASS bound to the current rubric, or stop after 18 turns

## Verification — 2026-06-10
| Rubric item | Command run | Result | Verdict |
|---|---|---|---|
| INDEX lists >=14 templates w/ use-when | `grep -c '\.md' INDEX.md` | 16 entries, each with one-line "Use when" column | PASS |
| >=14 template files | `ls skills/goal/rubrics \| grep -vc INDEX` | 16 templates | PASS |
| Every rubric line carries a check | `grep '^- \[ \]' *.md \| grep -v '— check:'` | only the 16 VERIFIER lines (exempt); gate lint case green | PASS |
| Stop conditions + Sources >=2 links | per-file awk/grep over all 16 | stop=1, sources=1, links 2-3 in every template | PASS |
| Templates recommend skills | `grep -l "Skills to pair" *.md` | all 16 files incl. frontend-design, rn-feature, nextjs-react-feature, documentation; vercel-react-best-practices / vercel-react-native-skills / web-design-guidelines present where claimed | PASS — note: rubric's literal check string `grep -l "Skills:"` matches nothing (heading is "## Skills to pair"); substance verified, check text is stale |
| SKILL.md Phase 3 wiring | `grep -n "rubrics/INDEX" / -i "available skills" skills/goal/SKILL.md` | both at line 51, inside Phase 3 (lines 44-56) | PASS |
| README mentions rubric library | `grep -i "rubric library" README.md` | line 72 | PASS |
| Test suite + plugin validate | `bash tests/gate-test.sh`; `claude plugin validate .` | 28 passed / 0 failed, exit 0; validation passed | PASS |
| v0.8.0 committed, pushed, clean | `grep version` both files; `git status --porcelain`; `git rev-parse HEAD origin/main` | 0.8.0 in both; status empty pre-verdict; HEAD=origin/main=6e35b08 | PASS |
| Content sanity (3 templates) | read web-performance, test-suite-health, app-store-readiness | LCP 2.5s/INP 200ms/CLS 0.1 cite web.dev/articles/vitals; 60/75/90 cites testing.googleblog.com 2020/08; Play API 36 from Aug 31 2026 cites support.google.com/11926878 | PASS |
| Constraints | `git show --stat 6e35b08`; commit message read | diff = rubrics/ + SKILL.md(2 lines) + README(2) + gate-test lint + versions + goal file; message mentions no AI tooling | PASS |

ULTRAGOAL-VERIFIED: PASS rubric=1205927289
