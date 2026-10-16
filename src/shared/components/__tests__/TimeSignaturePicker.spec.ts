import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import type { components } from '@/api/generated/core-domain'
import TimeSignaturePicker from '@/shared/components/TimeSignaturePicker.vue'

type TimeSignature = components['schemas']['TimeSignature']

let wrapper: VueWrapper | null = null

/** Mounts the picker as a holder would, taking each signature it reports. */
function mountPicker(modelValue: TimeSignature = { beats: 4, beat_value: 4 }) {
  wrapper = mount(TimeSignaturePicker, {
    props: { modelValue, 'onUpdate:modelValue': (next: TimeSignature) => wrapper!.setProps({ modelValue: next }) },
    attachTo: document.body,
  })
  return wrapper
}

const popover = () => document.querySelector<HTMLElement>('[data-test="time-signature-popover"]')
const press = async (test: string) => {
  document.querySelector<HTMLElement>(`[data-test="${test}"]`)!.click()
  await wrapper!.vm.$nextTick()
}
const shown = () => wrapper!.get('[data-test="time-signature"]').text()

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('TimeSignaturePicker', () => {
  it('shows the bar as a fraction, its choices on demand', () => {
    mountPicker()

    expect(shown()).toBe('4/4')
    expect(wrapper!.get('[data-test="time-signature"]').attributes('aria-label')).toBe('Time signature: 4/4')
    expect(popover()).toBeNull()
  })

  it('offers the presets, the current one chosen', async () => {
    mountPicker()
    await press('time-signature')

    const presets = [...popover()!.querySelectorAll('[data-test="time-signature-preset"]')]
    expect(presets.map((p) => p.textContent?.trim())).toEqual(['2/4', '3/4', '4/4', '6/8', '12/8'])
    expect(presets.map((p) => p.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true', 'false', 'false'])
  })

  it('sets the bar with a preset in one tap, and closes', async () => {
    mountPicker()
    await press('time-signature')

    ;[...popover()!.querySelectorAll<HTMLElement>('[data-test="time-signature-preset"]')][1]!.click()
    await wrapper!.vm.$nextTick()

    expect(shown()).toBe('3/4')
    expect(popover()).toBeNull()
  })

  it('changes the beats and the beat note with − and +, staying open', async () => {
    mountPicker()
    await press('time-signature')

    await press('beats-more')
    await press('beats-more')
    await press('beats-more')
    await press('beat-note-less')

    expect(shown()).toBe('7/8')
    expect(popover()).not.toBeNull()
  })

  it.each([
    [{ beats: 1, beat_value: 4 }, 'beats-less', '1/4'],
    [{ beats: 12, beat_value: 8 }, 'beats-more', '12/8'],
    [{ beats: 4, beat_value: 8 }, 'beat-note-less', '4/8'],
    [{ beats: 4, beat_value: 2 }, 'beat-note-more', '4/2'],
  ] as const)('keeps %o within its range when %s is pressed', async (start, button, bar) => {
    mountPicker({ ...start })
    await press('time-signature')

    expect(document.querySelector<HTMLButtonElement>(`[data-test="${button}"]`)!.disabled).toBe(true)
    await press(button)
    expect(shown()).toBe(bar)
  })

  it('closes unchanged on Escape', async () => {
    mountPicker()
    await press('time-signature')

    popover()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await wrapper!.vm.$nextTick()

    expect(popover()).toBeNull()
    expect(shown()).toBe('4/4')
  })
})
