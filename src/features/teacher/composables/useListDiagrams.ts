import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

export interface DiagramFilters {
  instrumentId?: string
  skillId?: string
  conceptId?: string
}

export function useListDiagrams(filters: DiagramFilters = {}) {
  const { items: diagrams, isLoading, error, retry } = useApiList<Diagram, [DiagramFilters]>(
    (coreApi, f) =>
      coreApi.GET('/diagrams', {
        params: {
          query: {
            ...(f.instrumentId ? { instrument_id: f.instrumentId } : {}),
            ...(f.skillId ? { skill_id: f.skillId } : {}),
            ...(f.conceptId ? { concept_id: f.conceptId } : {}),
          },
        },
      }),
    filters,
  )

  return { diagrams, isLoading, error, retry }
}
