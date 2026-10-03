# Practice spike — running findings log

Raw notes as they come up; the curated version goes to
`motifpath-specs/spikes/PB-22-practice-findings.md`.

## Model

1. **Tempo ladder stalled when sessions warm-started below the best tempo (M6).** With
   `start = best_clean − step`, two cleans per step and four takes a session, a student only
   ever climbed back to their previous best — the "improving" archetype was stuck at 75 BPM for
   three weeks. Fix: a session starts _at_ the best clean tempo; warming up is the warm-up
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
   take _above_ the best clean tempo since the last review doesn't count; at or below it, it's a
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

## Phase 5 — knowledge-graph model (2026-10-02)

16. **Per-string skills don't exist in the map (M7).** The map tracks `find-notes-root-strings` and
    `find-notes-top-strings`; the per-string view belongs to the heatmap (item level), not the graph.
17. **The 80% share rule dilutes wide nodes (M7).** Improving student, day 21: E/A-string cells
    `fluent`, yet the concept `note-names` (all 72 cells) and the parent `fretboard-fluency` read
    `new`. Honest for leaf skills — what `requires` usually points at — but a wide concept or a
    parent shown as "new" after three weeks contradicts the dashboard guidelines. Candidate rules:
    keep the share for the node level that `requires` checks, but show parents and concepts as
    coverage + distribution of their children, never a single misleading level. Open for the ADR.
18. **Requirements on empty nodes can never be met (M8).** `change-chords → play-open-chords` and
    `hear-intervals → match-pitch` point at nodes with no items: readiness 0/1 for everyone, forever.
    It informs (never gates), so nothing breaks, but it's a content-coverage signal: the map editor's
    coverage view should flag "required, nothing to practise".
19. **A node without `requires` is trivially ready (M9).** `find-notes-top-strings` has no edges, so
    it's always a stretch candidate. Ranking "builds on something you have" first keeps it behind the
    power-chord riff, which requires the root-string notes the student already knows.
20. **"Review ahead, then stretch" in strict order starves stretch (M9).** A caught-up 5-minute mind
    session holds 27 review-ahead items — all of them. Spike default: share the leftover time
    half/half, each taking over the other's share when it runs out. The improving student's mind
    sessions now mix both; the guitar session gets the power-chord riff as a stretch.
21. **A teacher suggestion can't end on a level the student already had (M5, decided rule).** An
    already-fluent flagged item, or an overconfident self-claim, would end the suggestion the moment
    it's written. The rule became: ends once practised _since the note_ and at the target level, or
    the teacher closes it; 30-day safety expiry.
22. **Graders work off reference data only (M11).** One interface, three versioned graders
    (fretboard_cell.v1, exercise_option.v1, self_rating.v1), 15 golden cases in language-neutral
    JSON (enharmonic spellings, octave on the same string, rejections). Evidence keeps the raw
    response + grader id, so a rule change can regrade. Simulator and live runners all go through
    ingest; the client shows feedback with the same grader.
23. **The fold needs more than KnowledgeState (M10).** Folding one piece at a time equals batch
    derivation for every archetype and item (property test), once the fold carries: counted
    attempts, the clean-tempo edge since the last review, the latest review's vouch, best clean
    tempo/count since review, the last 10 correct latencies, and the latest timestamp (to detect
    late evidence → rebuild the item from the log). Duplicates are dropped by evidence id. Evidence
    sharing one timestamp needs a defined tiebreak (arrival sequence) for fold == batch to hold.
24. **Concepts echo skills on the home (U7).** A concept backed by the same items as a skill
    repeats its progress line and its opportunities ("Pentatonic shapes" = "Alternate picking").
    Candidate: progress and opportunities per skill only; concepts appear in the map and as
    context ("uses: pentatonic shapes").
25. **Opportunities need a cap (U7).** Nine entries for the improving student — no longer
    at-a-glance. Candidate: top 3 (one refresh, one strengthen, one start), "see all" for the rest.
26. **Practice days need the student's time zone.** Days are counted by UTC date in the spike.

### Phase 5 walkthrough (headless Chrome, 2026-10-02)

All four archetypes' homes render from the summary with no console errors. Caught-up improving
student: mind-3 mixes review ahead / stretch (top-string cells) / weak spots; guitar-15 is warm-up,
due chord changes, power-chord riff as stretch, blues lick. A live tap goes response → grader →
feedback → evidence. Closing the overconfident student's note removes it from their home.

## Phase 6 — calibrating timed thresholds (2026-10-03)

Population simulator: 40 students × 8 sessions around a known true fluent time (2500 ms), benchmark
prior deliberately 2× off; 5 seeds per condition. Errors of the calibrated threshold:
base −4…+3% · 10 students −17…+2% · 6×4 sessions (just past the gate) −15…−32% · 30% felt noise
−8…+6% · ⅓ overconfident −4…+3% · ½ overconfident −4…+53% · 90% phones −4…+3%.

27. **Felt ratings are what make calibration work (M14).** Time alone (median of students who answer
    ≥90% right) lands −35…−51% off: it says how fast knowers are, not where the drill gets hard.
    Estimator: the net time that best separates sessions felt "hard" from the rest.
28. **Tap time must come out (M13).** Without subtracting each student's tap time the threshold comes
    out +12…+29% too lax, worse with phones. A 6-tap check (~20 s) gives the baseline; ingest stamps
    it on each answer so replays stay stable.
29. **Small samples drift toward the prior (M12).** Just past the gate (24 sessions) a wrong prior still
    pulls the result 15–32% off. Gate at more data (e.g. 100 sessions / 20 students) or weight the
    prior less once both felt classes are well represented.
30. **Overconfidence biases toward lax (M14).** Up to a third of students rating one step easier is
    absorbed; half of them pushes the threshold up to +53% too lax. Teacher-reviewed or audio
    evidence would be the check; meanwhile cap a single recalibration step (e.g. ±25%).
31. **Versioned thresholds never take back a level (M15).** Each answer is judged by the version in
    force when it happened; a new version applies forward only and needs no fold rebuild.
32. **Ask fewer felt questions (U8).** A 3-minute session asked four (two drill types + two exercises).
    Ask at most one or two per session, for the templates with the least calibration data, and group
    authored exercises by family; per-exercise data will be too sparse anyway.
33. **The core assumption is untested.** The simulator assumes a drill feels hard once the student is
    slower than fluent. Only real students can confirm the felt-vs-time relation; the spike validates
    the estimator given it.

### Phase 6 walkthrough

Tap check → 314 ms baseline; a 16-item mind session → "How did it feel?" per timed drill; rating
"Hard" stored; recalibrate → name_the_note v2 2442 ms from 321 sessions / 41 students (true 2500).
No console errors.

## Phase 7 — instruments (2026-10-03)

34. **Instrument fit keeps sessions honest (M16).** Items carry instrument_ids (exercises as in PB-86;
    cells = their instrument; play-alongs/chord changes = their diagrams'). Guitar in hand → no bass
    item; in your head → every instrument the student plays; theory items (every instrument) everywhere.
35. **Per-instrument node levels (M17).** Same node, same student: "Notes on the E and A strings" is
    Fluent on guitar and 0/24 started on bass. Readiness follows the instrument too.
36. **The graph alone can rank next steps (M18).** Requires depth per instrument replaced the
    uninstalled B/EI/I/A level; the power-chord riff is still the guitar stretch pick.
37. **Adding an instrument floods practice in your head.** With bass added, a 5-minute mind session
    was 24 bass "new" items of 29: the whole bass fretboard is new on her path while guitar is caught
    up. Candidate: cap new items per session (the 15% share as a ceiling), and balance across the
    student's instruments.
38. **Instrument-independent nodes repeat on every instrument tab.** Intervals show under guitar and
    bass alike. Candidate: an "Any instrument" group on the home.
39. **Questions must name the instrument when the student has several (U9).** "Where is A on string
    4?" is ambiguous for a guitar-and-bass student. The start stays two taps: "Which instrument is
    in your hands?" → minutes.
