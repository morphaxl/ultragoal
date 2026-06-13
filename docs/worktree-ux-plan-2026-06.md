# Plan: worktree UX for ultragoal (2026-06)

> **DECISION (2026-06-13): SHELVED — not building the worktree UX layer.** After this research, the owner decided against it. Reasons: (1) it's not essential — Boris personally uses multiple git checkouts, not worktrees (the team prefers worktrees, but checkouts get the same isolation), and our per-session gate + "hands off concurrent files" protocol already soften the collision risk; (2) a **structural mismatch with our own layout** — ultragoal's `.ultragoal/` lives at a workspace root that is *not* a git repo, above nested git repos, so a `git worktree` of a nested repo is created as a sibling that can't see the workspace-root `.ultragoal` (the gate would walk up and find the wrong one or none). Worktrees assume `.ultragoal` lives *inside* the repo being worktree'd; we don't, so we can't even dogfood it cleanly. (3) Even in the clean single-repo case, the worktree gets its own copy of `.ultragoal` from the branch point, so goal/memory state diverges and the gitignored `.turns`/`.rubric-hash` don't carry over — friction for a non-essential feature.
> **What stays:** the existing `npx ultragoal run --worktree` pass-through to native `claude --worktree` — zero-cost, and it works for users whose project *is* a single git repo with `.ultragoal` inside it (the clean case Boris's pattern assumes). We just don't build the offer + merge-back UX on top.
> The research below is kept as a "considered and rejected, with reasons" record — re-open only if ultragoal's `.ultragoal` placement changes or a strong single-repo-parallelism demand appears.

---

A research-backed decision + an implementation blueprint for a **future** goal. This doc does not change any code. Goal: offer a git worktree as a choice when arming/handing off a goal, work inside it, and offer a user-confirmed merge-back when it's safe — a thin UX layer over native worktrees, not a reimplementation.

## TL;DR / recommendation

**Build a thin worktree-UX layer on top of Claude Code's native `claude --worktree`, triggered *conditionally* (when concurrency risk is real), with a user-confirmed merge-back.** Don't reimplement `git worktree`; don't offer it on every goal (noise); don't auto-merge. This matches both Boris's recommendation (worktrees for collision-free parallelism) and ultragoal's lean ethos, and it closes the two real gaps below.

## 1. The @0xwhrrari "Loop Engineering" post

The post (pasted by the user) is a general loop-engineering explainer whose **six building blocks map almost 1:1 onto what ultragoal already is** — which is the main takeaway: it validates the design more than it adds to it.

| Post's building block | ultragoal status |
|---|---|
| Automations (the heartbeat) | Stop-hook loop ✓; scheduled/cron "dreaming" is roadmapped, not built |
| **Worktrees (parallel agents, no collisions)** | **partial — `run --worktree` exists; not offered at interview, no merge-back ← this plan** |
| Skills (reused project knowledge) | skill library + 16-template rubric library ✓ |
| Plugins/connectors (real tools) | inherits Claude Code MCP/connectors ✓ |
| Subagents (maker ≠ checker) | verifier + scouts + 3-lens panel ✓ |
| Memory (across runs) | two-layer provenance memory ✓ |

On worktrees specifically the post is high-level: *"A worktree gives each agent its own clean workspace and branch… multiple agents work in parallel without turning the repo into a mess."* No novel technique beyond that principle — the concrete design is the user's (offer + merge-back UX).

## 2. What Boris / Claude Code actually recommend (cited)

- **The team's #1 productivity tip:** *"Spin up 3–5 git worktrees at once, each running its own Claude session in parallel. The single biggest productivity unlock… Personally, I use multiple git checkouts, but most of the Claude Code team prefers worktrees."* — Boris Cherny ([x.com/bcherny/2017742743125299476](https://x.com/bcherny/status/2017742743125299476)). Note the nuance: worktrees vs multiple checkouts is a team-preference split; both are valid, worktrees are the default recommendation.
- **Native CLI support:** `claude --worktree [name]` runs Claude in its own worktree (name it, or let Claude name it); `--tmux` launches it in a tmux session; "each agent gets its own worktree and can work independently." ([threads/@boris_cherny DVAAoZ3gYut](https://www.threads.com/@boris_cherny/post/DVAAoZ3gYut), [x.com/bcherny/2025007393290272904](https://x.com/bcherny/status/2025007393290272904), and `research/claude-code/common-workflows.md` §"Run parallel sessions with worktrees").
- **Subagents in worktrees:** `isolation: "worktree"` in an agent definition runs a subagent in an isolated worktree and **merges its changes back** automatically — Boris uses it for "1-shotting large batch changes like codebase-wide migrations." This is the one place Claude Code does automatic merge-back today (subagent-scoped, not session-scoped).
- **Monitoring:** to watch parallel sessions from one screen instead of separate terminals, use background agents / agent-view (`common-workflows.md` → `/agent-view`). Cleanup, `.worktreeinclude`, and non-git VCS support live in the `/worktrees` reference.

**So "what Boris recommends" = native `claude --worktree` for collision-free parallel sessions, monitored via agent-view; merge-back is automatic only for `isolation:"worktree"` subagents, manual (you merge the branch) for top-level sessions.**

## 3. What ultragoal already has (the seams to build on)

- `npx ultragoal run --worktree` passes `--worktree` to `claude` (installer/cli.mjs ~L88,114) and prints *"merge it when the goal is done"* — so isolation exists but **merge-back is a manual hint, and the worktree is unnamed** (Claude auto-names it; we could name it by slug).
- The goal skill already **cautions** to suggest a worktree when a concurrent goal touches the same files (skills/goal/SKILL.md ~L33).
- `scripts/session-context.sh` already **detects and reports** "N other goal(s) active in OTHER sessions" — this is the exact signal a merge-back safety check needs.

**The two gaps:** (a) worktree is never *offered as a decision* in the interview/handoff; (b) there's no *merge-back UX*.

## 4. Three-way comparison

| Option | Pros | Cons |
|---|---|---|
| **(A) User's idea** — offer at interview/handoff, work in it, offer merge-back when no other agent is active | Closes both gaps; merge-back is the missing half of `run --worktree`; uses our existing other-goal detection | Offering on *every* goal is noise; "no other agent" is a point-in-time check (race); merge can conflict |
| **(B) Boris's native pattern** — just `claude --worktree`, monitor via agent-view, merge the branch yourself | Zero new code; battle-tested; what the CC team uses | No ultragoal UX — the user must know to use the flag and to merge by hand; doesn't help the merge-back ergonomics the user wants |
| **(C) Synthesis (recommended)** — thin UX layer over (B): conditionally **offer** the worktree at arm time when concurrency risk is real, name it by slug, and at completion offer a **user-confirmed merge-back** gated on session-context's other-goal check | Closes the gaps without reinventing anything; lean (offer only when it earns its place); honest about the race (user confirms) | A bit more skill prose + a small installer/name change |

**Recommendation: (C).** It's (B) plus exactly the two UX pieces the user asked for, and nothing more.

## 5. Implementation plan for the next goal (file-by-file)

- **`skills/goal/SKILL.md` — offer (Phase 1/4).** When arming, if session-context reports other active goals OR `kind: experiment` (commits/resets, touches everything), add a worktree option to the dials batch: *"Run this in an isolated worktree? (recommended — another goal is active / this is an experiment)."* On a solo goal with no concurrency, don't ask (mention it's available). On yes (and when not already launched via `run --worktree`), instruct the user to relaunch with `claude --worktree <slug>` (the model can't move its own session into a worktree mid-run — name the worktree by goal slug).
- **`skills/goal/SKILL.md` — merge-back (handoff/completion).** Add a completion step: when the goal finishes in a worktree, check session-context for other active goals; if none, **propose** the merge — show the branch, the diff stat, and ask the user to confirm (`AskUserQuestion`); on confirm, `git merge` (or guide a PR); on conflict or if another goal is active, pause and hand to the user. Never auto-merge.
- **`installer/cli.mjs` — name the worktree.** `run --worktree` currently passes a bare `--worktree`; pass the goal slug (derive from the brief or let Claude name it) so parallel goals get legible branch names, and update the "merge it when done" hint to point at the new merge-back UX.
- **`scripts/session-context.sh` — expose the safety signal.** It already detects other active goals; ensure that count is legible to the merge-back step (it already prints it; the goal skill reads it). No new detection needed.
- **Optional:** document `isolation: "worktree"` for read-heavy/migration subagents in the rigor=max guidance (Boris's batch-migration pattern), since that's the one auto-merge-back path Claude Code already provides.

### Edge cases the implementation goal must handle
- **Per-session gate × worktree.** A worktree is a separate checkout that shares `.git` but has its own working tree — so the goal file lives in *the worktree's* `.ultragoal/goals/active/`, and the gate (which walks up to the nearest `.ultragoal`) enforces it there. Merge-back merges *code*; the goal/memory state is per-worktree. The plan must decide whether memory distillation lands in the worktree's `.ultragoal/memory` (then merges back) or the main checkout's — recommend: distill in the worktree, merge memory along with code.
- **Point-in-time concurrency race.** "No other agent active" can change the instant after the check. Mitigation: the merge is always *user-confirmed*, and the check is advisory, not a lock.
- **Merge conflicts.** On conflict, pause the goal (`status: paused`) and hand to the user with the conflicting files named — never attempt an automatic resolution.
- **Cleanup.** After a confirmed merge, offer `git worktree remove` so stale worktrees don't accumulate (`/worktrees` reference covers cleanup).
- **Already-in-a-worktree.** If the goal was launched via `run --worktree`, don't re-offer at arm time — detect and skip.

### Rubric sketch for the implementation goal
- [ ] Goal skill offers a worktree at arm time when (other active goal detected ∨ kind:experiment), and not otherwise — check: grep skill for the conditional offer.
- [ ] Merge-back UX present: completion step proposes a user-confirmed merge gated on the no-other-active-goal check; conflicts pause the goal — check: grep skill for the merge-back protocol.
- [ ] `installer/cli.mjs` names the worktree by slug and points at the merge-back UX — check: grep cli.mjs.
- [ ] No reimplementation of `git worktree`; merge-back never auto-runs — check: grep for `git merge` only behind a confirm; constraint.
- [ ] Gate suite green; plugin validates; new behavior covered by a test if it touches the gate/scripts.
- [ ] VERIFIER sign-off.

## 6. Scope guardrails (keep it lean, honest)
- A thin UX layer over **native** `claude --worktree` — **do not reimplement** `git worktree`.
- Merge-back is **user-confirmed, not automatic** — a point-in-time "no other agent" check is advisory, and merges can conflict, so the agent always asks.
- **Offer conditionally**, not on every goal — worktrees earn their place under concurrency or experiment-kind; a solo goal shouldn't pay the ceremony.
- This is additive to the existing `run --worktree` flag, not a replacement.

## Sources
- Boris Cherny — parallel worktrees as the team's top tip: [x.com/bcherny/2017742743125299476](https://x.com/bcherny/status/2017742743125299476)
- Boris Cherny — built-in worktree support, `--worktree [name]`, `--tmux`, `isolation:"worktree"` subagent merge-back: [threads/@boris_cherny DVAAoZ3gYut](https://www.threads.com/@boris_cherny/post/DVAAoZ3gYut), [x.com/bcherny/2025007393290272904](https://x.com/bcherny/status/2025007393290272904)
- Official Claude Code docs (local): `research/claude-code/common-workflows.md` §"Run parallel sessions with worktrees" (+ `/worktrees`, `/agent-view` references)
- @0xwhrrari "Loop Engineering" post (pasted by the user) — worktrees as building-block #2
- ultragoal current seams: `installer/cli.mjs` (`run --worktree`), `skills/goal/SKILL.md` (worktree caution), `scripts/session-context.sh` (other-active-goal detection)
