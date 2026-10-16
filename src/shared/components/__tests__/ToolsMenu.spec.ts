import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import ToolsMenu from '@/shared/components/ToolsMenu.vue'
import { mockViewport } from '@/shared/testUtils/viewport'

enableAutoUnmount(afterEach)

function mountMenu(width = 390) {
  mockViewport(width)
  return mount(ToolsMenu, { attachTo: document.body })
}

const menu = () => document.querySelector<HTMLElement>('[data-test="tools-menu"]')

describe('ToolsMenu', () => {
  it('is a wrench named Tools', () => {
    const button = mountMenu().get('[data-test="tools"]')

    expect(button.attributes('aria-label')).toBe('Tools')
    expect(button.find('.lucide-wrench').exists()).toBe(true)
    expect(menu()).toBeNull()
  })

  it('lists the Metronome, the only tool, in a sheet on a phone', async () => {
    const wrapper = mountMenu(390)

    await wrapper.get('[data-test="tools"]').trigger('click')

    expect(menu()!.dataset.presentation).toBe('sheet')
    const rows = [...menu()!.querySelectorAll('[data-test^="tool-"]')]
    expect(rows.map((row) => row.textContent?.trim())).toEqual(['Metronome'])
  })

  it('lists the tools in a menu by the wrench on a wider screen', async () => {
    const wrapper = mountMenu(1024)

    await wrapper.get('[data-test="tools"]').trigger('click')

    expect(menu()!.dataset.presentation).toBe('menu')
  })

  it('opens the tool chosen, and closes', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="tools"]').trigger('click')

    menu()!.querySelector<HTMLElement>('[data-test="tool-metronome"]')!.click()
    await flushPromises()

    expect(wrapper.emitted('open')).toEqual([['metronome']])
    expect(menu()).toBeNull()
  })
})
