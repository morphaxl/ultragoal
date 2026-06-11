# Briefing guide — what to tell ultragoal so it crafts a great goal

You don't need structure. A messy, unedited voice ramble works — the interview exists to catch whatever's missing. But every signal you volunteer up front saves a question, prevents a wrong default, and sharpens the rubric. This page is the list of signals worth volunteering, roughly in order of value.

## The high-value signals

**1. The outcome, the why, and the who-for.** The single highest-value sentence in any brief. Not "add caching to the inventory check" but "checkout is slow and users are bouncing — it needs to feel instant." The model performs measurably better when it understands intent: it connects the work to the right context instead of guessing at it, and the *outcome* framing leaves it free to find a better route than the one you imagined.

**2. What "done" looks like — concretely.** This becomes the rubric, so it's where precision pays most. Three forms, any of them gold:

- **Numbers**: "under 200ms", "coverage above 80%", "bundle under 150KB"
- **Cases that must work**: "a guest checkout with an expired card must show the retry screen, not a 500"
- **How you'd check it by hand today**: "I usually run `pnpm test:checkout` and then hit `/api/cart` with the staging token" — name the commands you'd run to convince yourself. Whatever convinces you is exactly what the rubric should automate and the verifier should re-run.

**3. Scope edges — what NOT to touch.** The cheapest sentence you can say: "don't touch the payment provider integration", "leave the admin panel alone", "tests in `legacy/` are quarantined, ignore them." Prevents gold-plating, wasted turns, and surprise diffs.

**4. Hard constraints — what must not change or break.** Public API shapes, contract tests, behaviors other teams depend on, migration windows. These become verifier-checked Constraints: an item can pass its own check and still fail the goal by violating one.

**5. Tradeoff priorities.** When the loop can't max everything, which way should it lean? Speed vs robustness, coverage vs time, ship-now vs do-it-right. One sentence ("favor correctness over speed, this is billing code") settles a dozen downstream decisions.

**6. Pointers and prior art.** Files or directories involved, the ticket link, what was tried before and why it failed, known gotchas ("the flaky test in CI is unrelated, ignore it"). Past failures are especially valuable — they save the loop from re-walking dead ends, and they seed the Decision journal.

**7. Environment facts.** How to run the thing, where logs land, what only *you* can run (a device build, an authenticated flow, a command you prefer to keep in your hands). The loop is built to read logs and instrument code on its own — telling it where the signals live makes that immediate. If something needs you to run it, say so; it will ask you at the right moment with the exact command.

**8. Risk and autonomy.** What it may do freely versus what it must confirm first: "migrations are fine on the dev DB, never on staging", "don't push, I'll review the branch." Destructive or irreversible actions default to asking — but saying it up front means no mid-run stall.

**9. Size feel.** "Quick fix" vs "this is the big one, take the night." This calibrates both the interview depth (a big ambiguous goal earns more questions) and the turn budget.

## What to leave out

- **The route.** "Use Redis", "refactor to hooks first", "do it in three phases" — unless it's genuinely a mandate, state the outcome and let the loop find the route. The biggest wins in looped runs come from approaches the brief-writer didn't think of. If you *do* mandate an approach, say so explicitly — it'll be recorded as a constraint, not a suggestion.
- **Vague quality adjectives.** "Fast", "clean", "robust", "polished" can't be checked, so they can't be rubric items. Give a number, a case, or an example of good — or expect the interview to ask for one.
- **Step-by-step plans.** The loop owns the sequencing. A plan in the brief mostly narrows exploration.

## Weak vs strong — same ask, same messiness

**Weak** (every signal missing — expect a deep interview):

> make checkout faster and clean up the code around it

**Strong** (an actual ramble, but the signals are all there):

> okay so checkout is slow and we're seeing users bounce — I think it's the inventory
> check, we talked about caching it last week but honestly whatever works. it needs to
> be under 200ms p95, the bench script in bench/checkout.js measures it. definitely
> don't break the contract tests, other teams depend on those, and don't touch the
> payment provider code at all. we tried request batching in March and it deadlocked,
> there's a writeup in docs/postmortems. dev server logs go to .next/trace if you need
> them. this is worth a real run, take 30 turns if you need them — but migrations only
> on the dev database.

Same tone, same mess. The second one carries the outcome and why (1), a number and a check command (2), scope edges (3), constraints (4), prior art with a pointer (6), where logs live (7), risk lines (8), and a size feel (9). The interview for it will be two questions instead of twenty — and the rubric will be right the first time.

## One habit that compounds

After a goal finishes, if the result missed something you cared about — that's a signal you didn't share. Say it ("the bundle got bigger and I did care about that") and it gets written to memory as a correction, so the next goal's interview asks about it unprompted. The system is built to learn your bar; complaints are training data.
