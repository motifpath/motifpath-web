import { computed, ref, type Ref } from 'vue'

export interface SaveBlocker {
  /** The `data-field` of the editor element to jump to. */
  field: string
  label: string
}

/**
 * Keeps Save tappable: a Save with something missing is refused and shows what is missing, and
 * the list then follows the form until nothing is.
 */
export function useSaveBlockers(missing: Ref<SaveBlocker[]>) {
  const asked = ref(false)
  const reveal = ref(0)

  const shown = computed(() => (asked.value ? missing.value : []))

  /** True when the editor may save; otherwise shows what blocks it and brings the list into view. */
  function readyToSave(): boolean {
    if (missing.value.length === 0) {
      asked.value = false
      return true
    }
    asked.value = true
    reveal.value += 1
    return false
  }

  return { shown, reveal, readyToSave }
}
