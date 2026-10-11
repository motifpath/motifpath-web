import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TempoControl from '@/shared/components/TempoControl.vue'

type Props = { tempo: number; slowest: number; goal: number; best: number | null; metronome: boolean; disabled: boolean }

function mountControl(props: Partial<Props> = {}) {
  return mount(TempoControl, {
    props: { tempo: 90, slowest: 70, goal: 100, best: 80, metronome: true, disabled: false, ...props },
  })
}

describe('TempoControl', () => {
  it('is headed Tempo and shows the tempo it sets', () => {
    const wrapper = mountControl()

    expect(wrapper.get('[data-test="tempo-heading"]').text()).toBe('Tempo')
    expect(wrapper.get('[data-test="tempo-value"]').text()).toBe('90 BPM')
  })

  it('offers every tempo from the ladder’s slowest to 300 BPM, in 5 BPM steps, and marks its ends', () => {
    const wrapper = mountControl()

    const slider = wrapper.get('[data-test="tempo-slider"]')
    expect(slider.attributes()).toMatchObject({ min: '70', max: '300', step: '5' })
    expect(slider.attributes('aria-valuetext')).toBe('90 BPM')
    expect(wrapper.get('[data-test="tempo-min"]').text()).toBe('70')
    expect(wrapper.get('[data-test="tempo-max"]').text()).toBe('300')
  })

  it('shows the tempo as it slides, and chooses it in one gesture, once released', async () => {
    const wrapper = mountControl()

    const slider = wrapper.get<HTMLInputElement>('[data-test="tempo-slider"]')
    // Dragging fires input; setValue would fire change too, as releasing does.
    slider.element.value = '180'
    await slider.trigger('input')
    expect(wrapper.get('[data-test="tempo-value"]').text()).toBe('180 BPM')
    expect(wrapper.emitted('tempo')).toBeUndefined()

    await slider.trigger('change')
    expect(wrapper.emitted('tempo')).toEqual([[180]])
  })

  it('marks the best clean tempo and the goal on the slider', () => {
    const wrapper = mountControl()

    expect(wrapper.get('[data-test="tempo-tick-best"]').attributes('title')).toBe('Best clean 80 BPM')
    expect(wrapper.get('[data-test="tempo-tick-goal"]').attributes('title')).toBe('Goal 100 BPM')
  })

  it('marks no best clean tempo before the first clean take', () => {
    const wrapper = mountControl({ best: null })

    expect(wrapper.find('[data-test="tempo-tick-best"]').exists()).toBe(false)
  })

  it('lets the student type an exact tempo by tapping the value', async () => {
    const wrapper = mountControl()

    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    const field = wrapper.get('[data-test="tempo-input"]')
    expect((field.element as HTMLInputElement).value).toBe('90')
    await field.setValue('83')
    await field.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('tempo')).toEqual([[83]])
    expect(wrapper.find('[data-test="tempo-input"]').exists()).toBe(false)
  })

  it('keeps a typed tempo within the slider’s range', async () => {
    const wrapper = mountControl()

    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    await wrapper.get('[data-test="tempo-input"]').setValue('400')
    await wrapper.get('[data-test="tempo-input"]').trigger('keydown', { key: 'Enter' })
    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    await wrapper.get('[data-test="tempo-input"]').setValue('12')
    await wrapper.get('[data-test="tempo-input"]').trigger('blur')

    expect(wrapper.emitted('tempo')).toEqual([[300], [70]])
  })

  it('keeps the tempo when typing is cancelled or left empty', async () => {
    const wrapper = mountControl()

    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    await wrapper.get('[data-test="tempo-input"]').setValue('120')
    await wrapper.get('[data-test="tempo-input"]').trigger('keydown', { key: 'Escape' })
    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    await wrapper.get('[data-test="tempo-input"]').setValue('')
    await wrapper.get('[data-test="tempo-input"]').trigger('blur')

    expect(wrapper.emitted('tempo')).toBeUndefined()
    expect(wrapper.get('[data-test="tempo-value"]').text()).toBe('90 BPM')
  })

  it('turns the metronome on and off', async () => {
    const wrapper = mountControl()

    const metronome = wrapper.get('[data-test="metronome"]')
    expect(metronome.attributes('aria-pressed')).toBe('true')
    await metronome.trigger('click')

    expect(wrapper.emitted('update:metronome')).toEqual([[false]])
  })

  it('changes nothing while a take plays', async () => {
    const wrapper = mountControl({ disabled: true })

    expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="metronome"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="tempo-value"]').trigger('click')
    expect(wrapper.find('[data-test="tempo-input"]').exists()).toBe(false)
  })
})
