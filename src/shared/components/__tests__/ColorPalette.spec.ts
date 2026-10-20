import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ColorPalette from '@/shared/components/ColorPalette.vue'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'

describe('ColorPalette', () => {
  it('renders one swatch per palette color plus a clear swatch, and no free color input', () => {
    const wrapper = mount(ColorPalette)

    expect(wrapper.findAll('[data-test^="color-swatch-"]')).toHaveLength(COLOR_PALETTE.length)
    expect(wrapper.find('[data-test="color-palette-clear"]').exists()).toBe(true)
    expect(wrapper.find('input[type="color"]').exists()).toBe(false)
  })

  it('sizes the grid to its swatches so a shrink-to-fit popover cannot collapse them', () => {
    // jsdom does no layout: guard the classes instead. Bare `grid-cols-6` (minmax(0,1fr) tracks)
    // collapses to ~0 width inside an absolutely positioned, shrink-to-fit container and the
    // swatches overlap; `w-max` makes the grid as wide as its swatches. Verified in real Chrome.
    const classes = mount(ColorPalette).get('[data-test="color-palette"]').classes()

    expect(classes).toContain('grid-cols-6')
    expect(classes).toContain('w-max')
  })

  it('emits the swatch hex when a swatch is clicked', async () => {
    const wrapper = mount(ColorPalette)
    const first = COLOR_PALETTE[0]

    await wrapper.get(`[data-test="color-swatch-${first.key}"]`).trigger('click')

    expect(wrapper.emitted('select')).toEqual([[first.hex]])
  })

  it('emits null when the clear swatch is clicked', async () => {
    const wrapper = mount(ColorPalette, { props: { modelValue: COLOR_PALETTE[0].hex } })

    await wrapper.get('[data-test="color-palette-clear"]').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[null]])
  })

  it('marks only the current color as pressed, case-insensitively', () => {
    const current = COLOR_PALETTE[2]
    const wrapper = mount(ColorPalette, { props: { modelValue: current.hex.toLowerCase() } })

    const pressed = wrapper.findAll('[aria-pressed="true"]')
    expect(pressed).toHaveLength(1)
    expect(pressed[0].attributes('data-test')).toBe(`color-swatch-${current.key}`)
  })

  it('marks the clear swatch as pressed when there is no color', () => {
    const wrapper = mount(ColorPalette, { props: { modelValue: null } })

    expect(wrapper.get('[data-test="color-palette-clear"]').attributes('aria-pressed')).toBe('true')
  })

  it('gives every swatch an accessible name', () => {
    const wrapper = mount(ColorPalette)

    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('aria-label')?.length).toBeGreaterThan(0)
    }
  })

  it('disables the default swatch when clearing is not allowed', async () => {
    const wrapper = mount(ColorPalette, { props: { modelValue: COLOR_PALETTE[0].hex, allowClear: false } })
    const clear = wrapper.get('[data-test="color-palette-clear"]')

    expect(clear.attributes('disabled')).toBeDefined()
    await clear.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('allows clearing by default', () => {
    const wrapper = mount(ColorPalette)

    expect(wrapper.get('[data-test="color-palette-clear"]').attributes('disabled')).toBeUndefined()
  })
})
