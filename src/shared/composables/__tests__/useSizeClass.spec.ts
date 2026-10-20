import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'

import { useSizeClass } from '@/shared/composables/useSizeClass'
import { mockViewport } from '@/shared/testUtils/viewport'

function probe() {
  let result!: ReturnType<typeof useSizeClass>
  mount(
    defineComponent({
      setup() {
        result = useSizeClass()
        return () => h('div')
      },
    }),
  )
  return result
}

describe('useSizeClass', () => {
  it.each([
    [390, 'compact'],
    [599, 'compact'],
    [600, 'medium'],
    [839, 'medium'],
    [840, 'expanded'],
    [1280, 'expanded'],
  ])('a %i px wide window is %s', (width, expected) => {
    mockViewport(width)

    expect(probe().sizeClass.value).toBe(expected)
  })

  it('follows the window when it is resized', async () => {
    const viewport = mockViewport(1280)
    const { sizeClass, isCompact } = probe()

    viewport.resize(390)
    await nextTick()

    expect(sizeClass.value).toBe('compact')
    expect(isCompact.value).toBe(true)
  })
})
