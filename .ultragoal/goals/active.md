---
slug: rubric-library
status: active
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
- [ ] skills/goal/rubrics/INDEX.md lists ≥14 templates, each with a one-line "use when" — check: grep -c '\.md' INDEX entries ≥14
- [ ] ≥14 template files exist in skills/goal/rubrics/ — check: ls | wc -l
- [ ] Every rubric line in every template carries a check — check: no `- [ ]` line in rubrics/*.md lacks "— check:" (lint grep exits clean)
- [ ] Every template has Stop conditions and a Sources section with ≥2 authoritative references — check: grep -L counts are zero for both patterns
- [ ] Templates recommend relevant skills where applicable — check: grep -l "Skills:" matches the design/frontend/mobile/docs templates at minimum
- [ ] Goal skill Phase 3 instructs consulting rubrics/INDEX.md and using matching available skills — check: grep "rubrics/INDEX" and grep -i "available skills" in skills/goal/SKILL.md
- [ ] README mentions the rubric library — check: grep -i "rubric library" README.md
- [ ] bash tests/gate-test.sh exits 0 and claude plugin validate . passes
- [ ] v0.8.0 in plugin.json + package.json, committed, pushed, git status clean
- [ ] VERIFIER: independent sign-off recorded below

# Stop conditions
- 18 turns reached, or any item fails verification 3 consecutive times

# Constraints
- Thresholds come from the cited research (Core Web Vitals, WCAG 2.2, OWASP, official tool docs), never invented
- No behavior change beyond the library + goal-skill wiring + README
- Commit messages mention no AI tooling

# Verification log

# Decision journal

# Native fallback
/goal all rubric items in .ultragoal/goals/active.md are checked with evidence and the last verification line is a PASS bound to the current rubric, or stop after 18 turns
