import { computed, ref } from 'vue'

import type { PracticeTool } from '@/shared/components/ToolsMenu.vue'
import { useOverlayHistory } from '@/shared/composables/useOverlayHistory'

/**
 * The tool open over the practice setup, if any: a page pushed inside the Practice Shell that has
 * its own entry in the browser's history on the same URL, so the device's Back, like the page's
 * own arrow, returns to the setup as the student left it rather than leaving practice.
 */
export function usePracticeTool() {
  const tool = ref<PracticeTool | null>(null)
  useOverlayHistory(
    computed(() => tool.value !== null),
    () => {
      tool.value = null
    },
  )

  function open(next: PracticeTool) {
    tool.value = next
  }

  function close() {
    tool.value = null
  }

  return { tool, open, close }
}
