# Research foundations

Every mechanism in ultragoal traces to published research or documented engineering practice — nothing in the loop is vibes. This page maps each design decision to its evidence. The raw feed behind it: dated research memos in [`docs/research/`](research/) (latest: [June 2026 harness sweep](research/harness-research-2026-06.md), 40 primary sources across Anthropic, practitioner, Chinese-lab, and academic communities).

## The core loop

| Mechanism | What the research says | Sources |
|---|---|---|
| **Goal loop instead of prompting** | "Rather than directly prompting and steering, design loops that let the model self-correct in response to environment feedback." Rubric-driven loops let Fable 5 improve an ML pipeline ~6× more than the prior model generation. | [Lance Martin, Designing loops with Fable 5](https://x.com/RLanceMartin/article/2064397389189071163) |
| **Command-checkable rubric as the contract** | Decomposed per-criterion checks beat holistic judging by up to 31% relative and stay reliable on weaker judges; pre-agreed testable criteria frozen before building prevent building the wrong thing. | [Rubrics as Rewards](https://arxiv.org/abs/2507.17746) · [Anthropic: harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps) |
| **Rubric re-fed into the worker's context every turn** (the gate's stderr) | Checklist-style rubrics in the worker's context measurably improve rollouts — the same rubric then doubles as the judge's reference. | [RuscaRL (Alibaba/Zhejiang)](https://arxiv.org/abs/2508.16949) |
| **Outcomes, never approaches** (rubric items name end states, not routes) | Agents regularly find valid approaches spec authors didn't anticipate; step-prescriptive checks are brittle and "everything the grader checks should be clear from the task description." | [Anthropic: demystifying evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) |
| **Rubric defect linting** (split compound items, merge correlated ones, coverage check) | Fixing the known rubric defect taxonomy lifts judge accuracy up to +17.7 points. | [Recursive rubric refinement](https://arxiv.org/abs/2602.05125) |
| **Checks emit one decisive line** (wrap noisy commands) | Verbose raw output pollutes the loop's context and degrades it; a flawed or noisy verifier signal gets faithfully optimized. | [Anthropic: building a C compiler with Claude](https://www.anthropic.com/engineering/building-c-compiler) |
| **Mandatory turn budgets & stop conditions** | Unattended loops without budgets fail open-endedly (the documented 264-hour, $47,000 two-agent ping-pong); budgets are the loop-prevention the harness must own. | [Eigen Labs: verifiable looping agents](https://x.com/zeeshan_utd/article/2064703809990135846) |
| **In-session Stop-hook loop, fail-open** | The loop-inside-the-session pattern (cancellable, permission-aware) over external bash wrappers. | [Anthropic ralph-loop plugin pattern](https://github.com/anthropics/claude-plugins-official) |

## Verification

| Mechanism | What the research says | Sources |
|---|---|---|
| **Fresh-context verifier subagent, never self-critique** | Models confidently praise their own mediocre work; verifier subagents in independent context windows consistently outperform self-critique. Reasoning-trained models actually get *worse* at improving via self-verification. | [Anthropic: harness design](https://www.anthropic.com/engineering/harness-design-long-running-apps) · [Verification across model families](https://arxiv.org/abs/2512.02304) |
| **Verifier sees artifacts and command outputs, never the worker's narrative** | Judges over-trust fluent, low-perplexity text regardless of author; production safety classifiers deliberately strip the agent's reasoning and judge raw actions only. | [Perplexity self-preference bias](https://arxiv.org/abs/2410.21819) · [Anthropic: auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode) |
| **Evidence ledger** (worker records command + output under every checked box; bare checked box = automatic FAIL) | Judges verify +26% more accurately from curated evidence bundles than from full logs; making evidence collection an explicit agent duty changes execution behavior itself. | [SmartSnap (Tencent)](https://arxiv.org/abs/2512.22322) · [Anthropic: effective harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) |
| **Refutation-first protocol** (verifier states what would disprove each item before checking) | Generating evaluation principles before critiquing makes judges markedly more accurate; sampled judgments beat one big judgment. | [SPCT / DeepSeek-GRM](https://arxiv.org/abs/2504.02495) |
| **Pessimistic double-runs on shaky checks** | Repeated verification sampling raised verifier accuracy 94.5%→97.5%; pessimistic selection lifted solver accuracy up to +29pp with no solver change. | [Heimdall (ByteDance)](https://arxiv.org/abs/2504.10337) |
| **Earliest-failure localization in FAIL reports** | Recovery from the first wrong step beats both full restarts and end-of-trajectory reflection. | [Agent-R (ByteDance)](https://arxiv.org/abs/2501.11425) |
| **Rubric-hash-bound verdicts** (editing a check voids all prior approvals) | In-context anti-cheating exhortations are near-worthless under incentive pressure — checkability and tamper-evidence are the defense; capable models will route around weak check infrastructure. | [METR: reward hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/) · [Anthropic: eval awareness](https://www.anthropic.com/engineering/eval-awareness-browsecomp) |
| **Verify-before-stop gating works *with* the model's training** | Self-verification is an in-distribution behavior under verifiable-reward RL that grows with allotted budget — the gate triggers latent trained behavior rather than fighting it. | [DeepSeek-R1](https://arxiv.org/abs/2501.12948) |

## Memory

| Mechanism | What the research says | Sources |
|---|---|---|
| **Two-layer files** (compiled truth above the line, append-only dated evidence below) | Synthesis drifts into closed self-citing loops unless the raw evidence stays re-derivable; compiled layers should be rewritten freely, evidence never. | [Karpathy: LLM-wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) · gbrain (Garry Tan) |
| **Provenance tags on every claim** (`[VERIFIED]` / `[READ]` / `[INFERRED]` / `[USER-CORRECTION]`) | Memories are behavioral attractors — erroneous entries reproduce errors across sessions; write-time quality gating plus utility-based deletion yields +10% absolute. Typed memory units with provenance/lifecycle metadata enable large gains. | [Experience-following](https://arxiv.org/abs/2505.16067) · [MemOS](https://arxiv.org/abs/2507.03724) |
| **Corrections written immediately** | A user correction is the highest-confidence signal the system receives and dies with the session if deferred. | gbrain practice, validated in our own dogfooding |
| **Gate-enforced distillation** (the loop won't release until lessons are saved) | The fail → investigate → verify → distill → consult progression is what separates models that improve week-over-week from ones that write notes and never read them. | [Lance Martin, Designing loops with Fable 5](https://x.com/RLanceMartin/article/2064397389189071163) |
| **Fresh-context everything** (verifier, scouts, compaction discipline) | Input length alone degrades performance 13.9–85% even with perfect retrieval; long context is intrinsically harmful, independent of distraction. | [Context-length degradation](https://arxiv.org/abs/2510.05381) · [Chroma: context rot](https://research.trychroma.com/context-rot) |

## Experiments & behavior shaping

| Mechanism | What the research says | Sources |
|---|---|---|
| **Measure-and-ratchet experiment goals** (commit-before-measure, strict improvement, frozen evaluator) | The baseline-anchored metric loop with an immutable evaluator succeeded where one-shot "make it faster" prompts failed; validated beyond ML by industry adoption. | [Karpathy: autoresearch](https://github.com/karpathy/autoresearch) |
| **Behavioral prompt blocks shipped verbatim** (grounded progress claims, autonomy, scope discipline, communication) | Anthropic published the tested wording; grounded-claims instruction "nearly eliminated fabricated status reports" in their testing. | [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) |
| **Skills state outcomes, not step scripts** | Prompts and skills written for prior models are often too prescriptive and *reduce* output quality; harness structure transfers across models, prose strategy does not. | [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) · [Harness ablations](https://arxiv.org/abs/2604.25850) |
| **Full spec up front, sized interviews** | Long-horizon performance is maximized by one well-specified initial turn; ambiguous progressive specification reduces token efficiency and performance. | [Prompting Claude Fable 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5) |

## How this page stays honest

New mechanisms enter ultragoal through dated research memos in [`docs/research/`](research/) — each sweep records what was found, what was implemented, and what was *rejected with reasons*. If a mechanism here ever loses its evidential basis (models change; harness assumptions go stale), it should be removed from the product, not defended. As Anthropic's harness-design post puts it: every harness component encodes an assumption about a model deficiency, and should be periodically stress-tested for removal.
