import { describe, expect, it } from 'vitest'

import { fits, studentInstruments } from '@/spikes/practice/instruments'
const theory = { instrument_ids: [] }
const guitarOnly = { instrument_ids: ['guitar'] }
const guitars = { instrument_ids: ['guitar', 'electric-guitar'] }

describe('fits', () => {
  it('lets an item for every instrument fit any instrument', () => {
    expect(fits(theory, 'bass')).toBe(true)
  })
  it('lets an item fit the instruments it is for, and only those', () => {
    expect(fits(guitars, 'electric-guitar')).toBe(true)
    expect(fits(guitarOnly, 'bass')).toBe(false)
  })
})

describe('studentInstruments', () => {
  it('are those of the paths and courses enrolled in, plus any added in the profile, once each', () => {
    expect(
      studentInstruments({
        enrolments: [
          { instrument_ids: ['guitar'] },
          { instrument_ids: ['guitar', 'electric-guitar'] },
        ],
        profile_instrument_ids: ['bass', 'guitar'],
      }),
    ).toEqual(['guitar', 'electric-guitar', 'bass'])
  })

  it('takes nothing from an enrolment that is for every instrument', () => {
    expect(
      studentInstruments({ enrolments: [{ instrument_ids: [] }], profile_instrument_ids: [] }),
    ).toEqual([])
  })
})
