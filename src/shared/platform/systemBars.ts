import { SystemBars, SystemBarsStyle, type SystemBarsStyleOptions } from '@capacitor/core'
import { watch, type Ref } from 'vue'

import type { Theme } from '@/stores/theme'

/** The part of the device's system bars control that the app relies on. */
export interface NativeSystemBars {
  setStyle(options: SystemBarsStyleOptions): Promise<void>
}

/**
 * The status and navigation bars are transparent over the page, so their icons must read on the
 * app's own surface: dark icons on the light appearance, light icons on the dark one. They follow
 * the appearance in use, including Auto, and change the moment it does.
 */
export function followThemeWithSystemBars(theme: Ref<Theme>, bars: NativeSystemBars = SystemBars): void {
  watch(
    theme,
    (value) => {
      const style = value === 'dark' ? SystemBarsStyle.Dark : SystemBarsStyle.Light
      bars.setStyle({ style }).catch(() => undefined)
    },
    { immediate: true },
  )
}
