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
