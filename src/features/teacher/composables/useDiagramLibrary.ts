import { computed, ref, watch } from 'vue'

import { type DiagramFilters, useListDiagrams } from '@/features/teacher/composables/useListDiagrams'
import { useCourseListFilters } from '@/shared/composables/useCourseListFilters'

/**
 * all: every diagram the caller may see (for a teacher, the templates plus
 * their own); templates: basic diagrams only; mine: the ones the caller
 * created.
 */
export type DiagramScope = 'all' | 'templates' | 'mine'

/**
 * The diagram library for authoring, one page at a time: a scope, narrowed
 * server-side by name, instrument, language, skill, concept and root note.
 * The scope is not a filter, so clearing the filters keeps it. The library
 * filters by a single skill and a single concept, so only the first pick of
 * each is sent.
 */
export function useDiagramLibrary(callerId: string | undefined) {
  const { filters, searchText, query, hasActiveFilters: hasSharedFilters, clearFilters: clearShared } =
    useCourseListFilters()
  const scope = ref<DiagramScope>('all')
  const rootNote = ref('')

  const diagramFilters = computed<DiagramFilters>(() => {
    const { q, skill_ids, concept_ids, instrument_id, language } = query.value
    const note = rootNote.value.trim()
    return {
      ...(scope.value === 'templates' ? { kind: 'basic' as const } : {}),
      ...(scope.value === 'mine' && callerId ? { createdBy: callerId } : {}),
      ...(instrument_id ? { instrumentId: instrument_id } : {}),
      ...(language ? { language } : {}),
      ...(skill_ids?.[0] ? { skillId: skill_ids[0] } : {}),
      ...(concept_ids?.[0] ? { conceptId: concept_ids[0] } : {}),
      ...(q ? { name: q } : {}),
      ...(note ? { rootNote: note } : {}),
    }
  })

  const { diagrams, reload, ...page } = useListDiagrams(() => diagramFilters.value)
  watch(diagramFilters, () => void reload(), { deep: true })

  const hasActiveFilters = computed(() => hasSharedFilters.value || rootNote.value.trim() !== '')

  function clearFilters() {
    clearShared()
    rootNote.value = ''
  }

  return { diagrams, scope, filters, searchText, rootNote, hasActiveFilters, clearFilters, reload, ...page }
}
