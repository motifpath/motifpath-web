import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramLanguageTabs from '@/features/teacher/components/DiagramLanguageTabs.vue'

interface Props {
  languages: string[]
  active: string
  incomplete: string[]
  locked: boolean
}

function mountTabs(props: Partial<Props> = {}) {
  return mount(DiagramLanguageTabs, {
    props: { languages: ['en', 'pt_BR'], active: 'en', incomplete: [], locked: false, ...props },
  })
}

const tab = (wrapper: ReturnType<typeof mountTabs>, code: string) => wrapper.get(`[data-test="language-tab-${code}"]`)

describe('DiagramLanguageTabs', () => {
  it("shows one tab per language, with its flag and short code, marking the active one", () => {
    const wrapper = mountTabs()

    expect(tab(wrapper, 'en').text()).toContain('🇺🇸')
    expect(tab(wrapper, 'en').text()).toContain('EN')
    expect(tab(wrapper, 'pt_BR').text()).toContain('🇧🇷')
    expect(tab(wrapper, 'pt_BR').text()).toContain('PT')
    expect(tab(wrapper, 'en').attributes('aria-selected')).toBe('true')
    expect(tab(wrapper, 'pt_BR').attributes('aria-selected')).toBe('false')
    expect(tab(wrapper, 'pt_BR').attributes('aria-label')).toBe('Portuguese')
  })

  it('switches to a language when its tab is clicked', async () => {
    const wrapper = mountTabs()

    await tab(wrapper, 'pt_BR').trigger('click')

    expect(wrapper.emitted('select')).toEqual([['pt_BR']])
  })

  it('flags a language that is still missing text', () => {
    const wrapper = mountTabs({ incomplete: ['pt_BR'] })

    expect(wrapper.find('[data-test="language-tab-missing-pt_BR"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="language-tab-missing-en"]').exists()).toBe(false)
  })

  it('offers to add only the languages the diagram does not have yet', async () => {
    const wrapper = mountTabs({ languages: ['en'] })

    await wrapper.get('[data-test="add-language"]').trigger('click')
    const options = wrapper.findAll('[data-test^="add-language-option-"]')
    expect(options.map((o) => o.attributes('data-test'))).toEqual(['add-language-option-pt_BR'])

    await options[0]!.trigger('click')
    expect(wrapper.emitted('add')).toEqual([['pt_BR']])
    expect(wrapper.find('[data-test^="add-language-option-"]').exists()).toBe(false)
  })

  it('does not offer to add a language once the diagram has them all', () => {
    expect(mountTabs().find('[data-test="add-language"]').exists()).toBe(false)
  })

  it('removes a language only after the author confirms', async () => {
    const wrapper = mountTabs()

    await wrapper.get('[data-test="remove-language-pt_BR"]').trigger('click')
    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.get('[data-test="remove-language-dialog"]').text()).toContain('Portuguese')

    await wrapper.get('[data-test="remove-language-cancel"]').trigger('click')
    expect(wrapper.find('[data-test="remove-language-dialog"]').exists()).toBe(false)
    expect(wrapper.emitted('remove')).toBeUndefined()

    await wrapper.get('[data-test="remove-language-pt_BR"]').trigger('click')
    await wrapper.get('[data-test="remove-language-confirm"]').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([['pt_BR']])
    expect(wrapper.find('[data-test="remove-language-dialog"]').exists()).toBe(false)
  })

  it("never offers to remove a diagram's only language", () => {
    expect(mountTabs({ languages: ['en'] }).find('[data-test^="remove-language-"]').exists()).toBe(false)
  })

  it('offers no way to add or remove languages while locked, as for a template', () => {
    const wrapper = mountTabs({ languages: ['en'], locked: true })

    expect(wrapper.find('[data-test="add-language"]').exists()).toBe(false)
    expect(wrapper.find('[data-test^="remove-language-"]').exists()).toBe(false)
  })
})
