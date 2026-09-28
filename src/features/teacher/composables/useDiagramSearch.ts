import { computed, onScopeDispose, ref, watch } from 'vue'

import { useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type UserRef = components['schemas']['UserRef']

const SEARCH_DEBOUNCE_MS = 300

/**
 * The diagram library, searched: by part of a name (applied once typing
 * pauses), an exact root note, kind (templates or custom) and author, on
 * top of a fixed instrument when one is given. Any change starts over from
 * the first page.
 */
export function useDiagramSearch(instrumentId: () => string | undefined) {
  const nameText = ref('')
  const rootNote = ref('')
  const kind = ref<Diagram['kind'] | null>(null)
  const author = ref<UserRef | null>(null)
  const appliedName = ref('')

  const list = useListDiagrams(() => ({
    instrumentId: instrumentId(),
    name: appliedName.value,
    rootNote: rootNote.value,
    ...(kind.value ? { kind: kind.value } : {}),
    ...(author.value ? { createdBy: author.value.user_id } : {}),
  }))

  let searchTimer: ReturnType<typeof setTimeout> | undefined
  watch(nameText, (text) => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      appliedName.value = text.trim()
    }, SEARCH_DEBOUNCE_MS)
  })
  onScopeDispose(() => clearTimeout(searchTimer))

  watch([appliedName, rootNote, kind, () => author.value?.user_id], () => void list.reload())

  const hasActiveFilters = computed(
    () => appliedName.value !== '' || rootNote.value !== '' || kind.value !== null || author.value !== null,
  )

  function clearFilters() {
    clearTimeout(searchTimer)
    nameText.value = ''
    appliedName.value = ''
    rootNote.value = ''
    kind.value = null
    author.value = null
  }

  return { ...list, nameText, rootNote, kind, author, hasActiveFilters, clearFilters }
}
