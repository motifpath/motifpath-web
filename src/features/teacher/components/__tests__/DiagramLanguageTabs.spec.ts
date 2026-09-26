import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramLanguageTabs from '@/features/teacher/components/DiagramLanguageTabs.vue'
import type { MissingText } from '@/features/teacher/composables/useDiagramForm'

interface Props {
  languages: string[]
  active: string
  missing: Record<string, MissingText[]>
  locked: boolean
}

function mountTabs(props: Partial<Props> = {}) {
  return mount(DiagramLanguageTabs, {
    props: { languages: ['en', 'pt_BR'], active: 'en', missing: {}, locked: false, ...props },
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

  it('flags a language that is still missing text, for screen readers too', () => {
    const wrapper = mountTabs({ missing: { en: [], pt_BR: [{ kind: 'name' }] } })

    expect(wrapper.find('[data-test="language-tab-missing-pt_BR"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="language-tab-missing-en"]').exists()).toBe(false)
    expect(tab(wrapper, 'pt_BR').attributes('aria-label')).toBe('Portuguese is missing: the name')
    expect(tab(wrapper, 'en').attributes('aria-label')).toBe('English')
  })

  it('says on hover exactly what a language is missing', () => {
    const wrapper = mountTabs({
      missing: {
        pt_BR: [
          { kind: 'name' },
          { kind: 'regionCaption', region: 1 },
          { kind: 'markerLabel', position: 2 },
          { kind: 'markerNote', position: 3 },
        ],
      },
    })

    expect(tab(wrapper, 'pt_BR').attributes('title')).toBe(
      'Portuguese is missing: the name, the caption of region 1, the label of position 2, the note on position 3',
    )
    expect(tab(wrapper, 'en').attributes('title')).toBeUndefined()
  })

  it('holds nothing but tabs in its tab list, so assistive tech reads it as one', () => {
    const wrapper = mountTabs()

    const tablist = wrapper.get('[role="tablist"]')
    const focusable = tablist.findAll('button')
    expect(focusable.length).toBeGreaterThan(0)
    expect(focusable.every((button) => button.attributes('role') === 'tab')).toBe(true)
    expect(tablist.findAll('div').every((div) => div.attributes('role') === 'presentation')).toBe(true)
  })

  it('closes the add menu on Escape', async () => {
    const wrapper = mountTabs({ languages: ['en'] })
    await wrapper.get('[data-test="add-language"]').trigger('click')

    await wrapper.get('[data-test="add-language-menu"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[data-test="add-language-menu"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="add-language"]').attributes('aria-expanded')).toBe('false')
  })

  it('closes the add menu once focus moves somewhere else', async () => {
    const wrapper = mountTabs({ languages: ['en'] })
    await wrapper.get('[data-test="add-language"]').trigger('click')

    await wrapper.get('[data-test="add-language-picker"]').trigger('focusout', { relatedTarget: document.body })

    expect(wrapper.find('[data-test="add-language-menu"]').exists()).toBe(false)
  })

  it('keeps the add menu open while focus moves between its own options', async () => {
    const wrapper = mountTabs({ languages: ['en'] })
    await wrapper.get('[data-test="add-language"]').trigger('click')
    const option = wrapper.get('[data-test="add-language-option-pt_BR"]').element

    await wrapper.get('[data-test="add-language-picker"]').trigger('focusout', { relatedTarget: option })

    expect(wrapper.find('[data-test="add-language-menu"]').exists()).toBe(true)
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

  it('removes the active language only after the author confirms', async () => {
    const wrapper = mountTabs({ active: 'pt_BR' })
    expect(wrapper.find('[data-test="remove-language-en"]').exists()).toBe(false)

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
