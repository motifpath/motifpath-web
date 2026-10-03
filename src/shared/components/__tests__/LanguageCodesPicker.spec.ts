import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LanguageCodesPicker from '@/shared/components/LanguageCodesPicker.vue'

function mountPicker(modelValue: string[]) {
  return mount(LanguageCodesPicker, { props: { modelValue } })
}

function lastEmitted(wrapper: ReturnType<typeof mountPicker>): string[] | undefined {
  return wrapper.emitted('update:modelValue')?.at(-1)?.[0] as string[] | undefined
}

describe('LanguageCodesPicker', () => {
  it('offers "Any language" and each offered language by its name', () => {
    const wrapper = mountPicker(['any'])

    expect(wrapper.get('[data-test="language-any"]').text()).toBe('Any language')
    expect(wrapper.get('[data-test="language-option-en"]').text()).toBe('English')
    expect(wrapper.get('[data-test="language-option-pt_BR"]').text()).toBe('Portuguese')
  })

  it('shows "Any language" as chosen for language-agnostic content', () => {
    const wrapper = mountPicker(['any'])

    expect(wrapper.get('[data-test="language-any"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="language-option-en"]').attributes('aria-pressed')).toBe('false')
  })

  it('replaces "Any language" with the first language picked', async () => {
    const wrapper = mountPicker(['any'])

    await wrapper.get('[data-test="language-option-pt_BR"]').trigger('click')

    expect(lastEmitted(wrapper)).toEqual(['pt_BR'])
  })

  it('adds a second language to the choice', async () => {
    const wrapper = mountPicker(['pt_BR'])

    await wrapper.get('[data-test="language-option-en"]').trigger('click')

    expect(lastEmitted(wrapper)).toEqual(['pt_BR', 'en'])
  })

  it('goes back to "Any language" when the last language is removed, since a choice is never empty', async () => {
    const wrapper = mountPicker(['pt_BR'])

    await wrapper.get('[data-test="language-option-pt_BR"]').trigger('click')

    expect(lastEmitted(wrapper)).toEqual(['any'])
  })

  it('switches to "Any language" from specific languages', async () => {
    const wrapper = mountPicker(['en', 'pt_BR'])

    await wrapper.get('[data-test="language-any"]').trigger('click')

    expect(lastEmitted(wrapper)).toEqual(['any'])
  })
})
