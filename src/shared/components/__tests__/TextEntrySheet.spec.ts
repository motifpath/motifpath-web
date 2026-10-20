import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import TextEntrySheet from '@/shared/components/TextEntrySheet.vue'

describe('TextEntrySheet', () => {
  let wrapper: ReturnType<typeof mount> | null = null
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
  })

  function mountSheet(value = 'Strumming') {
    wrapper = mount(TextEntrySheet, {
      props: {
        open: true,
        title: 'Rename in this course',
        label: 'Title in this course',
        hint: "Leave it blank to use the path's own title.",
        placeholder: 'Travis picking',
        value,
        confirmLabel: 'Rename',
      },
      attachTo: document.body,
    })
    return wrapper
  }

  function input() {
    return document.querySelector<HTMLInputElement>('[data-test="text-entry-input"]')!
  }

  it('asks for the text with its label, hint and placeholder, starting from the current value', () => {
    mountSheet()

    expect(document.body.textContent).toContain('Rename in this course')
    expect(document.body.textContent).toContain('Title in this course')
    expect(document.body.textContent).toContain("Leave it blank to use the path's own title.")
    expect(input().value).toBe('Strumming')
    expect(input().placeholder).toBe('Travis picking')
  })

  it('confirms the text, trimmed', () => {
    mountSheet()

    input().value = '  Your first chords '
    input().dispatchEvent(new Event('input'))
    document.querySelector<HTMLButtonElement>('[data-test="text-entry-confirm"]')!.click()

    expect(wrapper!.emitted('confirm')).toEqual([['Your first chords']])
  })

  it('confirms on Enter too', () => {
    mountSheet()

    input().form!.dispatchEvent(new Event('submit', { cancelable: true }))

    expect(wrapper!.emitted('confirm')).toEqual([['Strumming']])
  })

  it('starts again from the value each time it opens', async () => {
    mountSheet()
    input().value = 'Typed, never confirmed'
    input().dispatchEvent(new Event('input'))

    await wrapper!.setProps({ open: false })
    await wrapper!.setProps({ open: true, value: 'Stage 2' })

    expect(input().value).toBe('Stage 2')
  })
})
