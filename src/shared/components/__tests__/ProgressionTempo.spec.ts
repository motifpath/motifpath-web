import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ProgressionTempo from '@/shared/components/ProgressionTempo.vue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

enableAutoUnmount(afterEach)

function mountTempo(props: Partial<{ tempo: number; noteValue: TempoNoteValue; metronome: boolean }> = {}) {
  return mount(ProgressionTempo, { props: { tempo: 72, noteValue: 'quarters', metronome: false, ...props }, attachTo: document.body })
}

describe('ProgressionTempo', () => {
  it('is a chip showing the tempo, named with it', () => {
    const chip = mountTempo().get('[data-test="progression-tempo"]')

    expect(chip.text()).toBe('72')
    expect(chip.attributes('aria-label')).toBe('Tempo: 72 BPM')
  })

  it('opens Tempo: the metronome at the level’s tempo with the suggested note values, its bar locked', async () => {
    const wrapper = mountTempo()

    await wrapper.get('[data-test="progression-tempo"]').trigger('click')

    expect(wrapper.get('[data-test="overlay-sheet"], [data-test="overlay-dialog"]').text()).toContain('Tempo')
    expect(wrapper.get('[data-test="tempo-value"]').text()).toBe('72 BPM')
    expect(wrapper.get('[data-test="note-value"]').attributes('aria-label')).toBe('Note value: Quarters')
    expect(wrapper.get('[data-test="locked-time-signature"]').text()).toBe('4/4 · one chord a bar')
  })

  it('says the tempo, note value and metronome chosen', async () => {
    const wrapper = mountTempo()
    await wrapper.get('[data-test="progression-tempo"]').trigger('click')

    const control = wrapper.findComponent({ name: 'TempoControl' })
    control.vm.$emit('tempo', 90)
    control.vm.$emit('update:noteValue', 'eighths')
    control.vm.$emit('update:metronome', true)

    expect(wrapper.emitted('update:tempo')).toEqual([[90]])
    expect(wrapper.emitted('update:noteValue')).toEqual([['eighths']])
    expect(wrapper.emitted('update:metronome')).toEqual([[true]])
  })

  it('closes on Done', async () => {
    const wrapper = mountTempo()
    await wrapper.get('[data-test="progression-tempo"]').trigger('click')

    await wrapper.get('[data-test="progression-tempo-done"]').trigger('click')

    expect(wrapper.find('[data-test="tempo-control"]').exists()).toBe(false)
  })
})
