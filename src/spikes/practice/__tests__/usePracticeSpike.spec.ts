import { beforeEach, describe, expect, it } from 'vitest'

import { STUDENT_ID, TEACHER_ID } from '@/spikes/practice/fixtures/catalog'
import { BASS_ID, GUITAR_ID } from '@/spikes/practice/fixtures/graph'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

describe('usePracticeSpike — live activity', () => {
  const spike = usePracticeSpike()
  beforeEach(() => spike.resetLive())

  it('counts a live answer toward the derived state, graded from the raw response', () => {
    const key = 'fretboard_cell:instrument-guitar:4:2'
    const before = spike.states.value.get(key)!
    spike.answer(key, { kind: 'find_the_note', string: 4, fret: 2, latency_ms: 1500 }, 's')
    const after = spike.states.value.get(key)!
    expect(after.attempts).toBe(before.attempts + 1)
    expect(after.last_seen_at).not.toBe(before.last_seen_at)
  })

  it('stores nothing for a response the grader rejects', () => {
    const key = 'fretboard_cell:instrument-guitar:4:2'
    const before = spike.states.value.get(key)!.attempts
    const result = spike.answer(
      key,
      { kind: 'option_choice', option_id: 'a', latency_ms: 900 },
      's',
    )
    expect(result).toEqual({ rejected: 'response_does_not_fit_item' })
    expect(spike.states.value.get(key)!.attempts).toBe(before)
  })

  it('keeps live events in the order they happened', () => {
    const a = spike.clock()
    const b = spike.clock()
    expect(Date.parse(b)).toBeGreaterThan(Date.parse(a))
  })

  it("brings a live teacher note into the next session's suggestions", () => {
    spike.addNote(
      {
        teacher_note_id: 'n',
        student_id: STUDENT_ID,
        teacher_id: TEACHER_ID,
        created_at: spike.clock(),
        take_id: null,
        item_key: null,
        rating: null,
        bpm: null,
        verified: false,
        rubric: {},
        comments: [],
        summary: 'Work on chord changes',
        needs_work: { skill_ids: ['change-chords'], concept_ids: [] },
        suggested_item_keys: [],
        target_level: 'accurate',
        closed_at: null,
      },
      null,
    )
    expect(spike.activeNotes.value.map((n) => n.teacher_note_id)).toContain('n')
    const focus = spike.compose(GUITAR_ID, 5).blocks.find((b) => b.kind === 'focus')!
    expect(focus.entries[0]!.reason).toBe('teacher_suggested')
  })
})

describe('usePracticeSpike — threshold calibration', () => {
  const spike = usePracticeSpike()
  beforeEach(() => spike.resetLive())
  const NAME = 'fretboard_cell:name_the_note'
  const key = 'fretboard_cell:instrument-guitar:6:1'

  it('starts from the team benchmark for every timed fretboard drill', () => {
    expect(spike.book.value.map((t) => [t.template, t.version, t.source])).toEqual([
      [NAME, 1, 'benchmark'],
      ['fretboard_cell:find_the_note', 1, 'benchmark'],
    ])
  })

  it('stamps the tap time from the tap check on every later answer', () => {
    expect(spike.saveTapCheck([600, 700, 650, 640, 720])).toBe(650)
    const result = spike.answer(
      key,
      { kind: 'name_the_note', chosen_note: 'F', latency_ms: 2000 },
      's',
    )
    expect(result).toMatchObject({ source: 'auto_graded', tap_ms: 650 })
  })

  it('keeps how a drill felt, once per drill per session', () => {
    spike.rateFelt('s', NAME, 'hard')
    spike.rateFelt('s', NAME, 'about_right')
    expect(spike.felt.value.filter((f) => f.session_id === 's')).toEqual([
      expect.objectContaining({ template: NAME, felt: 'about_right' }),
    ])
  })

  it('adds a calibrated version from a simulated population, in force from now', () => {
    const t = spike.recalibrate(NAME, 2500)
    expect(t).toMatchObject({ template: NAME, version: 2, source: 'calibrated' })
    expect(Math.abs(t.fluent_ms - 2500) / 2500).toBeLessThan(0.15)
    expect(spike.book.value.filter((x) => x.template === NAME)).toHaveLength(2)
  })
})

describe('usePracticeSpike — instruments', () => {
  const spike = usePracticeSpike()
  beforeEach(() => spike.resetLive())
  const ROOT = 'find-notes-root-strings'
  const levelOn = (instrument: string) =>
    spike
      .summaryFor(instrument)
      .areas.flatMap((a) => a.nodes)
      .find((n) => n.node_id === ROOT)?.level

  it('plays what the enrolments say, plus what the profile adds', () => {
    expect(spike.instrumentIds.value).toEqual([GUITAR_ID])
    spike.toggleProfileInstrument(BASS_ID)
    expect(spike.instrumentIds.value).toEqual([GUITAR_ID, BASS_ID])
  })

  it('keeps the same node’s level apart per instrument', () => {
    spike.toggleProfileInstrument(BASS_ID)
    expect(levelOn(GUITAR_ID)).toBe('fluent')
    expect(levelOn(BASS_ID)).toBe('new')
  })

  it('brings bass notes into practice in your head once bass is one of the student’s instruments', () => {
    const bassKeys = (s: ReturnType<typeof spike.compose>) =>
      s.blocks.flatMap((b) => b.entries).filter((e) => e.item_key.includes(BASS_ID))
    expect(bassKeys(spike.compose(null, 5))).toHaveLength(0)
    spike.toggleProfileInstrument(BASS_ID)
    expect(bassKeys(spike.compose(null, 5)).length).toBeGreaterThan(0)
  })
})
