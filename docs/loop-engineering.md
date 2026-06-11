# Loop Engineering: Stop Prompting Your Agent, Design Its Environment

The head of Claude Code at Anthropic said it plainest: "I don't prompt Claude anymore. I have loops running that prompt Claude and figure out what to do. My job is to write loops."

I went down the rabbit hole — Anthropic's Fable 5 prompting guide, Lance Martin's loop experiments, everything written around them. This is what I actually learned, and the system I built so you can use it without understanding any of the machinery.

## When you prompt, you are the loop

Think about what you do in a long session with an agent. You give the instruction, read the output, judge it, catch the false claims, remind it what it forgot, decide when it's done.

The model does the typing. You are the quality control, the memory, and the off switch.

That's fine for a five-minute task. It collapses at five hours. Not because the model isn't smart enough — the new ones genuinely are — but because *you* don't scale. You can't review two hundred actions an hour. You can't stay awake overnight. The moment you stop watching, the system has zero verification left.

Loop engineering is the fix. You design a small system around the model — a goal, a check, a memory, a stopping rule — and the system does the steering. You build the loop once. The loop does the prompting.

## A loop is five words

Act, check, keep, revert, repeat.

The agent does something, checks the result, keeps what works, reverts what doesn't, and repeats until the work passes.

The whole thing depends on one question: **what can the loop use to check its own work?**

That question — not the model, not the prompt — decides whether a loop converges or just produces more output, faster.

## Five things I learned

**1. The rubric is doing more work than the model.**

Anthropic gave Fable 5 nine checkable criteria and eight hours on an ML optimization challenge. Same loop, and it beat the previous model generation by roughly 6x. The model is the easy part now. Writing down "done" in a form a command can check — that's the skill.

**2. Never let the worker grade its own homework.**

Ask a model "is it done?" and it will say yes while the tests fail. That's not lying — it's the same blind spot every author has about their own work. The fix that measures best: a second agent with fresh eyes. Separate context, never saw the worker's reasoning, re-runs every check itself, and is instructed to *refute* the claims rather than confirm them. The maker and the checker must be different minds.

**3. Memory is a loop across sessions.**

Every new session is day one unless you build otherwise. The progression that compounds: fail, investigate why, verify the diagnosis, distill it into a general rule, and consult that rule next time instead of re-deriving it. Weak models write notes and never read them. The strongest complete the cycle and genuinely get better week over week — but only if there's a place to write. Memory is built, it doesn't emerge.

**4. Every loop needs a stopping rule.**

Two agents got into a polite ping-pong, each handing work back to the other. Nobody was watching. They ran for 264 hours. The bill was $47,000. An unattended loop without a budget isn't autonomous — it's unexploded.

**5. Loops only work where "done" is checkable.**

A coding loop has gravity:

- Tests pass
- Build passes
- Benchmark improves
- The bug is gone

The environment tells the agent when it's wrong. Green means done.

Most other work has no clean score at the moment it's made. A weak landing page still loads. A bland post still publishes. Nothing in the environment stops it. For that work you either build judgment gates — is the claim sourced, is this specific or filler, does it sound like us — or you end the loop at "this is worth a human decision" instead of "done."

Knowing which kind of task you're holding is half the job. Agents that copy the motion of coding loops without the verification layer just produce more work, faster, with less taste.

## Which tasks this is for

Loops win wherever the work is long, multi-step, and has a checkable end state: refactors, migrations, performance hunts ("p95 under 200ms without breaking the contract tests"), bug investigations, twenty-experiment optimizations, overnight runs.

Prompting stays right for everything short and judgment-shaped, where you'll read the whole output anyway. Your thirty-second review *is* the verification.

## The problem: wiring this yourself is a lot

Here's the bill of materials if you build it by hand. A goal file with machine-checkable criteria. A hook that intercepts the agent every time it tries to stop. A separate verifier agent with restricted tools and adversarial instructions. Protection against the agent editing the checks it's graded on. Turn budgets and stop conditions. A memory system that doesn't let the agent confidently write down things that aren't true. Escape hatches so none of it can ever trap you.

I built all of that once, made every mistake available, and packaged it. That became **ultragoal**, a Claude Code plugin:

```bash
npx ultragoal     # one-time install
```

From then on, `/ultragoal:goal <your messy brief>` inside any Claude Code session does everything — the first use in a repo scaffolds a `.ultragoal/` directory and asks three preference questions, about sixty seconds. Or skip the editor entirely:

```bash
npx ultragoal run "checkout is slow — get p95 under 200ms without breaking contract tests"
```

That launches Claude Code with the goal armed and full autonomy on. `npx ultragoal update` keeps every install current.

## What the loop guarantees

You ramble — an unedited voice transcript is genuinely fine. It interviews you on the two to five forks that actually change the outcome, compiles a rubric where **every line is checkable by a command, never vibes**, and shows you a short recap. You confirm. The loop arms. Then you walk away — and while you're gone:

**It can't stop early.** A gate intercepts every attempt to finish. Unfinished rubric? Back to work, with the remaining items listed. The agent can't leave by being confident, only by being checked.

**It can't grade itself.** Before any box is checked, a fresh-eyes verifier re-runs every check and tries to refute the claim. No command output, no pass.

**It can't move the goalposts.** Every verdict is bound to a fingerprint of the exact rubric it judged. Edit a check, and every prior approval voids automatically.

**It can't run forever.** Turn budgets and stop conditions are mandatory. Hitting them forces an honest report of where every item stands, then a pause.

**It can't forget.** The loop won't release until lessons are written to memory, each tagged with how it's known — verified by a command, read in a doc, or merely inferred. Your repo gets smarter with every goal.

**It can't trap you.** The gate fails open on any error, `/ultragoal:stop` bails instantly, and an abandoned goal still distills what it learned. Failure is memory too.

Everything it produces — the goal, the rubric, the verdicts, the memory — is plain markdown in your repo. Diffable, editable mid-flight, shared with your team through git. No dashboard, no database, no lock-in.

The honest version of the reliability claim: I'm not telling you the model became trustworthy. I'm telling you **no claim survives the loop without a command output behind it**. The trust lives in the structure, not in the model's mood.

## Under the hood, briefly

For the technically curious — the whole engine is smaller than you'd guess:

- **The loop driver is a Stop hook**: about 150 lines of POSIX shell that run every time the session tries to end. Exit 0 releases; exit 2 blocks, and stderr — the unchecked items plus the protocol — becomes the model's next instruction. There's no model call in the driver. The intelligence is in the worker; the discipline is deterministic.
- **Goals are per-session files** (`.ultragoal/goals/active/<slug>/goal.md`) with budget and session ID in frontmatter. Parallel sessions can run parallel goals in one repo; pair with `git worktree` when they touch the same files.
- **Verification is hash-bound.** The verifier recomputes the rubric's checksum itself — it never accepts one quoted to it — re-runs the checks, and appends `ULTRAGOAL-VERIFIED: PASS rubric=<hash>` to the goal file. The gate only accepts a verdict whose hash matches the current rubric.
- **Memory files are two layers**: compiled claims above a divider, rewritten freely, each carrying a provenance tag; below it, an append-only dated evidence log that's never edited. Synthesis can be wrong; evidence can't.
- **Metric goals run a ratchet.** "Make this number better" briefs compile to commit-before-measure experiments: keep a change only if strictly better, `git reset` on regression, log every attempt. The measure command is frozen at arm time and the verifier diffs it against the baseline commit. The agent improves the number, never the measurement.

## Borrowed parts

None of this is invented from zero. The best loop systems are assembled from proven pieces, and I'd rather credit them than pretend otherwise.

The core thesis — verifier subagents over self-critique, and the fail → investigate → verify → distill → consult memory progression — comes straight from Lance Martin's loop experiments at Anthropic. The behavioral prompts ultragoal injects (grounded progress claims, autonomy, scope discipline, communication style) are Anthropic's official Fable 5 prompt blocks, shipped verbatim — they published what works, and there's no reason to paraphrase it worse.

The stop-hook architecture — the loop living *inside* the session, cancellable and permission-aware, instead of a bash wrapper restarting the agent from outside — follows Anthropic's ralph-loop plugin pattern.

The experiment ratchet is Karpathy's autoresearch loop: baseline first, one change per experiment, commit before measuring, keep only strict wins, and never let the agent touch the evaluator. And the memory format combines Karpathy's LLM-wiki pattern with Garry Tan's gbrain: compiled truth above the line, append-only evidence below, provenance on every claim, and user corrections written down the moment they happen.

Deliberately not borrowed: swarm orchestration (one worker, one verifier, and a few cheap scout agents is the recipe that actually works), bash wrapper loops, and custom project-management layers. Goals are files. Git is the tracker.

## Where it honestly falls short

I'd rather you hit these limits forewarned than annoyed.

**The rubric bounds everything.** The loop converges on whatever the checks say is good. A wrong rubric means confident convergence on the wrong thing, green checkmarks all the way down. The system attacks its own draft rubrics for vagueness and missing stop conditions before you see them, but rubric quality stays partly on you.

**Fresh eyes, same species.** The verifier is an independent context, not an independent mind — same model family, same blind spots. It reliably catches fabricated progress and stale claims; it won't catch a check that's subtly wrong in a way that fools the whole model class.

**Evidence, not proof.** Verdicts carry command outputs you can audit, but the trust boundary is your own machine. Proving to an outside party what an agent executed is attestation territory — this isn't that.

**Judgment work stays hard.** If "done" can't be made checkable, ultragoal refuses the vibe rubric rather than faking one. That's the right failure mode, but it's still a boundary.

**Loops cost tokens.** Independent verification roughly doubles the work behind every claim. Budgets cap the blast radius; pick goals worth the spend.

**Understanding stays your job.** The final report names the two or three diffs most worth reading with your own eyes. Verification proves the work passes — reading is how you keep understanding your own codebase. Nobody has automated that, including me.

## The takeaway

Prompt engineering asks: how do I phrase it so the model does it right?

Loop engineering asks: what structure would make it impossible to call this done when it isn't?

The first is persuasion. The second is engineering — a checkable goal, fresh-eyes verification, memory that survives, and a stopping rule. That's the whole idea.

The model is the easy part now. Design the loop.

[ultragoal on GitHub](https://github.com/morphaxl/ultragoal) · `npx ultragoal`

---

*Further reading: Lance Martin's [Designing loops with Fable 5](https://x.com/RLanceMartin/article/2064397389189071163), Anthropic's [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5), [Karpathy's autoresearch](https://github.com/karpathy/autoresearch), Lian Lim on [loop engineering](https://x.com/dashboardlim/status/2064736540757012991), Shann Holmberg on [coding vs marketing loops](https://x.com/shannholmberg/status/2064700139235844220), and Zeeshan's [guide to verifiable looping agents](https://x.com/zeeshan_utd/status/2064703809990135846).*
