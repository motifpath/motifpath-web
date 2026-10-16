import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'

import NoteValuePicker from '@/shared/components/NoteValuePicker.vue'
import { ALL_NOTE_VALUES, SUGGESTED_NOTE_VALUES } from '@/shared/utils/tempoNoteValue'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

let wrapper: VueWrapper | null = null

function mountPicker(props: { modelValue?: TempoNoteValue; values?: readonly TempoNoteValue[]; disabled?: boolean } = {}) {
  wrapper = mount(NoteValuePicker, {
    props: { modelValue: 'quarters', values: SUGGESTED_NOTE_VALUES, ...props },
    attachTo: document.body,
  })
  return wrapper
}

const popover = () => document.querySelector<HTMLElement>('[data-test="note-value-popover"]')
const choices = () => [...document.querySelectorAll<HTMLElement>('[data-test="note-value-choice"]')]

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('NoteValuePicker', () => {
  it('shows the current note value, named in words', () => {
    const picker = mountPicker({ modelValue: 'eighths' })

    const button = picker.get('[data-test="note-value"]')
    expect(button.attributes('aria-label')).toBe('Note value: Eighths')
    expect(button.find('[data-note-value="eighths"]').exists()).toBe(true)
    expect(popover()).toBeNull()
  })

  it('offers the values it is given as icons named in words, the chosen one checked and described', async () => {
    const picker = mountPicker({ modelValue: 'quarters' })

    await picker.get('[data-test="note-value"]').trigger('click')

    expect(choices().map((c) => c.getAttribute('aria-label'))).toEqual(['Quarters', 'Eighths', 'Triplets', 'Sixteenths'])
    expect(choices().map((c) => c.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false', 'false'])
    expect(popover()!.textContent).toContain('Quarters · the beat only')
  })

  it('offers every value in the Metronome tool', async () => {
    const picker = mountPicker({ values: ALL_NOTE_VALUES })

    await picker.get('[data-test="note-value"]').trigger('click')

    expect(choices().map((c) => c.getAttribute('aria-label'))).toEqual([
      'Halves',
      'Quarters',
      'Eighths',
      'Triplets',
      'Sixteenths',
      'Quintuplets',
      'Sextuplets',
      '32nds',
    ])
  })

  it('applies a choice at once and closes', async () => {
    const picker = mountPicker()
    await picker.get('[data-test="note-value"]').trigger('click')

    choices()[1]!.click()
    await picker.vm.$nextTick()

    expect(picker.emitted('update:modelValue')).toEqual([['eighths']])
    expect(popover()).toBeNull()
  })

  it('closes unchanged on a tap outside it', async () => {
    const picker = mountPicker()
    await picker.get('[data-test="note-value"]').trigger('click')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await picker.vm.$nextTick()

    expect(popover()).toBeNull()
    expect(picker.emitted('update:modelValue')).toBeUndefined()
  })

  it('closes unchanged on Escape', async () => {
    const picker = mountPicker()
    await picker.get('[data-test="note-value"]').trigger('click')

    popover()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await picker.vm.$nextTick()

    expect(popover()).toBeNull()
    expect(picker.emitted('update:modelValue')).toBeUndefined()
  })

  it('opens nothing while disabled', async () => {
    const picker = mountPicker({ disabled: true })

    await picker.get('[data-test="note-value"]').trigger('click')

    expect(popover()).toBeNull()
  })
})
