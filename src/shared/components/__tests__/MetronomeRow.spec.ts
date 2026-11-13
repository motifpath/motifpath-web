import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import MetronomeRow from '@/shared/components/MetronomeRow.vue'

enableAutoUnmount(afterEach)

const base = { beats: 4, lit: null, tempo: 60, slowest: 20, goal: null, best: null, metronome: false, disabled: false } as const

describe('MetronomeRow', () => {
  it('shows a dot a beat beside the tempo control, the sounding beat lit', () => {
    const row = mount(MetronomeRow, { props: { ...base, beats: 3, lit: 1 } })

    const dots = row.findAll('[data-test="beat-dot"]')
    expect(dots).toHaveLength(3)
    expect(dots.map((dot) => dot.attributes('data-lit'))).toEqual(['false', 'true', 'false'])
    expect(row.get('[data-test="tempo-value"]').text()).toBe('60 BPM')
  })

  it('marks the best clean tempo and the goal it is given', () => {
    const row = mount(MetronomeRow, { props: { ...base, best: 50, goal: 60 } })

    expect(row.find('[data-test="tempo-tick-best"]').exists()).toBe(true)
    expect(row.find('[data-test="tempo-tick-goal"]').exists()).toBe(true)
  })

  it('passes the tempo, metronome and note value the student picks on', async () => {
    const row = mount(MetronomeRow, { props: { ...base, noteValue: 'quarters', noteValues: ['quarters', 'eighths'] } })

    await row.get('[data-test="tempo-value"]').trigger('click')
    await row.get('[data-test="tempo-input"]').setValue('72')
    await row.get('[data-test="tempo-input"]').trigger('keydown', { key: 'Enter' })
    await row.get('[data-test="metronome"]').trigger('click')

    expect(row.emitted('tempo')?.at(-1)).toEqual([72])
    expect(row.emitted('update:metronome')?.at(-1)).toEqual([true])
  })

  it('shows what goes before the dots, such as the bar picker', () => {
    const row = mount(MetronomeRow, { props: base, slots: { before: '<span data-test="before">4/4</span>' } })

    expect(row.get('[data-test="before"]').text()).toBe('4/4')
  })
})
