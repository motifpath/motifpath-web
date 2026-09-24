import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ColorPaletteMenu from '@/shared/components/ColorPaletteMenu.vue'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'

function mountMenu() {
  return mount(ColorPaletteMenu, {
    props: { title: 'Font color', testId: 'font' },
    slots: { default: '<span data-test="icon" />' },
  })
}

describe('ColorPaletteMenu', () => {
  it('keeps the palette closed until the trigger is clicked', async () => {
    const wrapper = mountMenu()

    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)
    await wrapper.get('[data-test="font-trigger"]').trigger('click')
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(true)
  })

  it('renders the slot icon and titles the trigger', () => {
    const wrapper = mountMenu()

    expect(wrapper.find('[data-test="icon"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="font-trigger"]').attributes('title')).toBe('Font color')
  })

  it('emits select and closes when a swatch is chosen', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="font-trigger"]').trigger('click')

    await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[1].key}"]`).trigger('click')

    expect(wrapper.emitted('select')).toEqual([[COLOR_PALETTE[1].hex]])
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)
  })

  it('closes on Escape and on an outside click without emitting', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="font-trigger"]').trigger('click')
    await wrapper.get('[data-test="color-palette-menu"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)

    await wrapper.get('[data-test="font-trigger"]').trigger('click')
    await wrapper.get('[data-test="color-palette-overlay"]').trigger('click')
    expect(wrapper.find('[data-test="color-palette"]').exists()).toBe(false)
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('shows the current color as an indicator on the trigger', () => {
    const wrapper = mount(ColorPaletteMenu, {
      props: { title: 'Font color', testId: 'font', modelValue: COLOR_PALETTE[0].hex },
    })

    const indicator = wrapper.get('[data-test="font-indicator"]')
    expect(indicator.attributes('style')).toContain('background-color')
    expect(indicator.attributes('data-color')).toBe(COLOR_PALETTE[0].hex)
  })

  it('shows an empty indicator when there is no color', () => {
    const wrapper = mountMenu()

    expect(wrapper.get('[data-test="font-indicator"]').attributes('data-color')).toBe('')
  })

  it('highlights the current color inside the opened palette', async () => {
    const current = COLOR_PALETTE[4]
    const wrapper = mount(ColorPaletteMenu, {
      props: { title: 'Font color', testId: 'font', modelValue: current.hex },
    })
    await wrapper.get('[data-test="font-trigger"]').trigger('click')

    expect(wrapper.get(`[data-test="color-swatch-${current.key}"]`).attributes('aria-pressed')).toBe('true')
  })

  it('passes allowClear through to the palette, and shows an optional hint under it', async () => {
    const wrapper = mount(ColorPaletteMenu, {
      props: { title: 'Font color', testId: 'font', allowClear: false, hint: 'A saved color cannot be removed.' },
    })
    await wrapper.get('[data-test="font-trigger"]').trigger('click')

    expect(wrapper.get('[data-test="color-palette-clear"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="color-palette-hint"]').text()).toBe('A saved color cannot be removed.')
  })

  it('leaves the default swatch enabled unless clearing is disallowed', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="font-trigger"]').trigger('click')

    expect(wrapper.get('[data-test="color-palette-clear"]').attributes('disabled')).toBeUndefined()
  })

  it('shows no hint by default', async () => {
    const wrapper = mountMenu()
    await wrapper.get('[data-test="font-trigger"]').trigger('click')

    expect(wrapper.find('[data-test="color-palette-hint"]').exists()).toBe(false)
  })
})
