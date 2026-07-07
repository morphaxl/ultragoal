# The "What you'll see" recap block (UI goals)

For any goal that adds or changes a screen, destination, or navigation, the recap leads with a "What you'll see" block — the built thing described from the user's chair, never what the code does. Prose like "a Messages tab" hides exactly the disagreement a picture surfaces: the user pictures a bottom-bar destination, the agent (reading a hidden route in the config) pictures a header icon, and nothing in a sentence catches it. Make the end state visible instead:

- **Navigation map** — the exact contents of the bottom bar / header / global nav AFTER the change (drawing it forces you to read the *current* IA first — which is where placement landmines hide).
- **Screen inventory** — one line per screen: name · what it's for · how it's reached.
- **ASCII wireframe** for any new or changed screen — rough boxes showing where things sit.
- **Flow** — the tap-path of the core journey (e.g. "tap Messages tab → list → friend → thread").
- **Assumptions I'm making** — the implicit choices stated plainly (placement, default state, what's hidden vs. shown) so the user can veto the ones where their picture differs.

This block *replaces* the prose of recap part 3 ("what I'm going to do") for UI work — a nav map is denser and clearer than three sentences about navigation, so it is not extra ceremony. It is skipped entirely for backend/refactor goals, which instead confirm their own end-state artifact: an endpoint signature, the resulting file tree, a sample input→output.

When the placement or layout has real alternatives, use `AskUserQuestion`'s `preview` field to show them side-by-side as ASCII so the user picks what it will look like, rather than approving a noun.

Carry the block into the finish summary, and — when the spec will be handed to another session — into the handoff prompt, so the locked picture travels with it instead of being re-derived from config. The rubric must then *check* the placement, not just that the screen renders — see rubric-guide's reachability pattern (wired ≠ renders ≠ reachable).
