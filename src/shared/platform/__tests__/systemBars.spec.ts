import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import { followThemeWithSystemBars, type NativeSystemBars } from '@/shared/platform/systemBars'
import type { Theme } from '@/stores/theme'

function fakeBars() {
  return { setStyle: vi.fn<NativeSystemBars['setStyle']>().mockResolvedValue(undefined) }
}

describe('followThemeWithSystemBars', () => {
  it('shows dark status bar icons on the light appearance', () => {
    const bars = fakeBars()

    followThemeWithSystemBars(ref<Theme>('light'), bars)

    expect(bars.setStyle).toHaveBeenCalledWith({ style: 'LIGHT' })
  })

  it('shows light status bar icons on the dark appearance', () => {
    const bars = fakeBars()

    followThemeWithSystemBars(ref<Theme>('dark'), bars)

    expect(bars.setStyle).toHaveBeenCalledWith({ style: 'DARK' })
  })

  it('updates the icons at once when the appearance changes', async () => {
    const bars = fakeBars()
    const theme = ref<Theme>('light')
    followThemeWithSystemBars(theme, bars)

    theme.value = 'dark'
    await nextTick()

    expect(bars.setStyle).toHaveBeenLastCalledWith({ style: 'DARK' })
  })

  it('carries on when the device refuses the style', async () => {
    const bars = { setStyle: vi.fn<NativeSystemBars['setStyle']>().mockRejectedValue(new Error('not supported')) }

    expect(() => followThemeWithSystemBars(ref<Theme>('light'), bars)).not.toThrow()
    await Promise.resolve()
  })
})
