import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { reactive, ref } from 'vue'

import type { SupportedLocale } from '@/i18n'

const currentUser = reactive({
  locale: ref<SupportedLocale>('en'),
  setLocale: vi.fn(async () => {}),
})

vi.mock('@/stores/currentUser', () => ({
  useCurrentUserStore: () => currentUser,
}))

import LocaleSwitcher from '@/shared/components/LocaleSwitcher.vue'

function mountSwitcher() {
  return mount(LocaleSwitcher)
}

describe('LocaleSwitcher', () => {
  it('renders an option for each supported locale', () => {
    const wrapper = mountSwitcher()

    expect(wrapper.find('[data-test="locale-option-en"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="locale-option-pt-BR"]').exists()).toBe(true)
  })

  it('shows each option as a flag, with the language name as its accessible name', () => {
    const wrapper = mountSwitcher()

    const en = wrapper.get('[data-test="locale-option-en"]')
    expect(en.text()).toBe('🇺🇸')
    expect(en.attributes('aria-label')).toBe('English')

    const ptBr = wrapper.get('[data-test="locale-option-pt-BR"]')
    expect(ptBr.text()).toBe('🇧🇷')
    expect(ptBr.attributes('aria-label')).toBe('Português')
  })

  it('marks the current locale as the selected option', () => {
    currentUser.locale = 'en'
    const wrapper = mountSwitcher()

    expect(wrapper.get('[data-test="locale-option-en"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="locale-option-pt-BR"]').attributes('aria-pressed')).toBe('false')
  })

  it('reflects a non-English current locale as selected', () => {
    currentUser.locale = 'pt-BR'
    const wrapper = mountSwitcher()

    expect(wrapper.get('[data-test="locale-option-pt-BR"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="locale-option-en"]').attributes('aria-pressed')).toBe('false')
  })

  it('calls setLocale with the chosen locale when an option is clicked', async () => {
    currentUser.locale = 'en'
    const wrapper = mountSwitcher()

    await wrapper.get('[data-test="locale-option-pt-BR"]').trigger('click')

    expect(currentUser.setLocale).toHaveBeenCalledWith('pt-BR')
  })

  it('does not stop the click from bubbling, so a parent menu can close on selection', async () => {
    currentUser.locale = 'en'
    const onClick = vi.fn()
    const wrapper = mount({
      components: { LocaleSwitcher },
      setup: () => ({ onClick }),
      template: '<div @click="onClick"><LocaleSwitcher /></div>',
    })

    await wrapper.get('[data-test="locale-option-pt-BR"]').trigger('click')

    expect(onClick).toHaveBeenCalled()
  })
})
