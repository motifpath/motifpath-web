# Practice spike — running findings log

Raw notes as they come up; the curated version goes to
`motifpath-specs/spikes/PB-22-practice-findings.md`.

## Model

1. **Tempo ladder stalled when sessions warm-started below the best tempo (M6).** With
   `start = best_clean − step`, two cleans per step and four takes a session, a student only
   ever climbed back to their previous best — the "improving" archetype was stuck at 75 BPM for
   three weeks. Fix: a session starts *at* the best clean tempo; warming up is the warm-up
   block's job, not the ladder's.
2. **"Due" and "lapsed" are two different signals (M3, U4).** Fading defined as "overdue by more
   than the item's own wait" left cells untouched for two weeks reading as not fading. Split:
   `fading` = the review is due (drives "9 notes are fading"); the shown level drops only once
   overdue by more than the wait.
3. **One evidence projection covers every kind (M1, first signal).** All kinds reduce to
   hit/miss/hold + an accuracy value + a fluency ratio against the item's goal (latency for
   knowledge, tempo for play-along, changes/min for chord changes). Kind-specific payloads stay
   on the evidence; mastery never branches on kind beyond that projection.
4. **A teacher review resets self-claims (M2).** `best_clean_bpm` counts only clean claims since
   the latest teacher review; `verified` is the latest review's vouch. No special cases elsewhere.
5. **Generated items need an identity in events (M4).** `item_key`
   (`fretboard_cell:<instrument>:<string>:<fret>`) has no row anywhere; today's answer event only
   carries `exercise_id`.
6. **Tempo-ladder takes above the best are exploration, not misses (M2, M6).** The ladder pushes
   every session to the edge, so "almost/struggled" at a new tempo dragged accuracy down: an
   improving student clean at 115/120 BPM read as "Learning" (74%). Rule: a self-assessed non-clean
   take *above* the best clean tempo since the last review doesn't count; at or below it, it's a
   real miss; a teacher rating always counts.
7. **Warm-up tempo ≠ ladder start (U2).** Warm-up must start comfortably below the best (≈80%),
   outside the ladder; the ladder starts at the best clean tempo (finding 1).
8. **Rollups need coverage next to fluency (U4).** "Fretboard knowledge 96%" with only 24 of 72
   cells ever met misleads. Show "met n/N" with mean fluency over met items.
9. **Teacher suggestions need a lifetime (M5).** Without one, a note steers every future session.
   Spike uses 14 days; the real rule (expiry vs "done when practised" vs teacher closes it) is open.
10. **Count-in belongs in the sequence, not a timer (U2).** iOS only starts audio inside the tap,
    so the count-in is rest steps prepended to the take, and loops are unrolled so a take ends on
    its own and goes straight to rating — no "stop" tap needed.
11. **Verification is a manual teacher call (decided 2026-10-01).** No automatic rule promotes an
    item to `verified`; the teacher's "I vouch for it" on a review is the only source.
12. **A caught-up student runs dry (M6, product).** The improving archetype's 3-minute mind session
    had 4 items: everything on the path was fresh. Needs a rule — "review ahead" (least-secure
    not-due items) and/or "stretch" (the next skills on the path). Open for the PO.
13. **A flagged item must not become the warm-up (M5).** The composer warmed up on the drill the
    teacher had just flagged, because it was the most fluent. Warm-ups now exclude suggested items.
14. **Short guitar sessions skip the warm-up (U1).** At 3 minutes the warm-up took the whole budget.
15. **Live-timestamp bug in the spike's own plumbing.** Live evidence was stamped after "now" and
    silently filtered out — the scripted walkthrough caught it; no effect on the model.

## Scripted walkthrough (headless Chrome over CDP, fake camera)

All loops click through end to end with no console errors: mind session → summary; guitar session
(recorded warm-up take, rating, chord-change minute) → summary; take sent for review → teacher
video review with timestamped comment, rating, needs-work skill and suggestions → home shows the
note → next session's focus is "Suggested by your teacher"; overconfident and decaying archetypes
on Progress; decaying at day 30 → 27 items fading, a 5-minute session of 26 due reviews.
