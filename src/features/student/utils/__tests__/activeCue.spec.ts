import { describe, expect, it } from 'vitest'

import { activeCue } from '@/features/student/utils/activeCue'
import { makeParagraphCue, makeTimedCue } from '@/features/student/testing/expandedContent'

describe('activeCue', () => {
  it('returns nothing for an empty cue list', () => {
    expect(activeCue([], 10)).toBeUndefined()
  })

  it('returns nothing before the first cue starts', () => {
    const cues = [makeTimedCue('a', 5, 10)]

    expect(activeCue(cues, 4.99)).toBeUndefined()
  })

  it('shows a cue exactly at its start second', () => {
    const cue = makeTimedCue('a', 5, 10)

    expect(activeCue([cue], 5)).toBe(cue)
  })

  it('keeps showing a cue between its start and end', () => {
    const cue = makeTimedCue('a', 5, 10)

    expect(activeCue([cue], 7.5)).toBe(cue)
  })

  it('hides a cue exactly at its end second', () => {
    const cues = [makeTimedCue('a', 5, 10)]

    expect(activeCue(cues, 10)).toBeUndefined()
  })

  it('returns nothing after a cue has ended', () => {
    const cues = [makeTimedCue('a', 5, 10)]

    expect(activeCue(cues, 42)).toBeUndefined()
  })

  it('returns nothing in the gap between two cues, then the later one', () => {
    const first = makeTimedCue('a', 5, 10)
    const second = makeTimedCue('b', 20, 25)

    expect(activeCue([first, second], 15)).toBeUndefined()
    expect(activeCue([first, second], 20)).toBe(second)
  })

  it('shows the cue with the earlier start when two overlap', () => {
    const earlier = makeTimedCue('earlier', 5, 20)
    const later = makeTimedCue('later', 10, 15)

    expect(activeCue([earlier, later], 12)).toBe(earlier)
  })

  it('picks the earlier start even when the list is not sorted', () => {
    const earlier = makeTimedCue('earlier', 5, 20)
    const later = makeTimedCue('later', 10, 15)

    expect(activeCue([later, earlier], 12)).toBe(earlier)
  })

  it('falls back to the later cue once the earlier one has ended', () => {
    const earlier = makeTimedCue('earlier', 5, 11)
    const later = makeTimedCue('later', 10, 15)

    expect(activeCue([earlier, later], 12)).toBe(later)
  })

  it('shows the first listed cue when two start at the same second', () => {
    const first = makeTimedCue('first', 5, 10)
    const second = makeTimedCue('second', 5, 12)

    expect(activeCue([first, second], 6)).toBe(first)
  })

  it('ignores cues that have no video timing', () => {
    const paragraphCue = makeParagraphCue('p', 3)

    expect(activeCue([paragraphCue], 3)).toBeUndefined()
  })

  it('does not reorder or mutate the list it is given', () => {
    const later = makeTimedCue('later', 10, 15)
    const earlier = makeTimedCue('earlier', 5, 20)
    const cues = [later, earlier]

    activeCue(cues, 12)

    expect(cues).toEqual([later, earlier])
  })
})
