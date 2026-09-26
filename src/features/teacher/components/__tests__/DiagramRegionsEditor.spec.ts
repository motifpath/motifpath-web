import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramRegionsEditor from '@/features/teacher/components/DiagramRegionsEditor.vue'
import type { LocalRegion } from '@/features/teacher/composables/useDiagramForm'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'

function makeRegion(overrides: Partial<LocalRegion> = {}): LocalRegion {
  return {
    id: 'r1',
    fretStart: 5,
    fretEnd: 8,
    stringStart: null,
    stringEnd: null,
    description: { en: 'Box 1', pt_BR: 'Caixa 1' },
    color: null,
    ...overrides,
  }
}

function mountEditor(props: Partial<InstanceType<typeof DiagramRegionsEditor>['$props']> = {}) {
  return mount(DiagramRegionsEditor, {
    props: { regions: [makeRegion()], stringCount: 6, language: 'en', invalidIds: [], ...props },
  })
}

function inputValue(wrapper: ReturnType<typeof mountEditor>, selector: string): string {
  const element = wrapper.get(selector).element
  return element instanceof HTMLInputElement ? element.value : ''
}

describe('DiagramRegionsEditor', () => {
  it('lists one row per region, showing its frets and its caption in the editing language', () => {
    const wrapper = mountEditor({ regions: [makeRegion(), makeRegion({ id: 'r2', fretStart: 7, fretEnd: 10 })], language: 'pt_BR' })

    expect(wrapper.findAll('[data-test="region-row"]')).toHaveLength(2)
    expect(inputValue(wrapper, '[data-test="region-fret-start"]')).toBe('5')
    expect(inputValue(wrapper, '[data-test="region-fret-end"]')).toBe('8')
    expect(inputValue(wrapper, '[data-test="region-description"]')).toBe('Caixa 1')
  })

  it('asks to add a region', async () => {
    const wrapper = mountEditor({ regions: [] })

    await wrapper.get('[data-test="region-add"]').trigger('click')

    expect(wrapper.emitted('add')).toHaveLength(1)
  })

  it('emits new fret bounds, keeping the other bound', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="region-fret-start"]').setValue('3')
    await wrapper.get('[data-test="region-fret-end"]').setValue('12')

    expect(wrapper.emitted('set-frets')).toEqual([
      ['r1', 3, 8],
      ['r1', 5, 12],
    ])
  })

  it('covers every string until the author limits it, then offers string bounds', async () => {
    const wrapper = mountEditor()
    expect(wrapper.find('[data-test="region-string-start"]').exists()).toBe(false)

    await wrapper.get('[data-test="region-all-strings"]').setValue(false)
    expect(wrapper.emitted('set-strings')).toEqual([['r1', 1, 6]])

    const limited = mountEditor({ regions: [makeRegion({ stringStart: 1, stringEnd: 3 })] })
    expect(inputValue(limited, '[data-test="region-string-start"]')).toBe('1')
    await limited.get('[data-test="region-string-end"]').setValue('4')
    await limited.get('[data-test="region-all-strings"]').setValue(true)
    expect(limited.emitted('set-strings')).toEqual([
      ['r1', 1, 4],
      ['r1', null, null],
    ])
  })

  it('emits a typed caption, limited to 60 characters', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="region-description"]').setValue('Shape 1')

    expect(wrapper.emitted('set-description')).toEqual([['r1', 'Shape 1']])
    expect(wrapper.get('[data-test="region-description"]').attributes('maxlength')).toBe('60')
  })

  it("picks and clears a region's color", async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="region-color-trigger"]').trigger('click')
    await wrapper.get(`[data-test="color-swatch-${COLOR_PALETTE[0].key}"]`).trigger('click')
    await wrapper.get('[data-test="region-color-trigger"]').trigger('click')
    await wrapper.get('[data-test="color-palette-clear"]').trigger('click')

    expect(wrapper.emitted('set-color')).toEqual([
      ['r1', COLOR_PALETTE[0].hex],
      ['r1', null],
    ])
  })

  it('removes a region', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-test="region-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['r1']])
  })

  it('flags an invalid region', () => {
    expect(mountEditor().find('[data-test="region-invalid"]').exists()).toBe(false)
    expect(mountEditor({ invalidIds: ['r1'] }).find('[data-test="region-invalid"]').exists()).toBe(true)
  })
})
