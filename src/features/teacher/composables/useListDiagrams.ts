import { useApiPagedList } from '@/shared/composables/useApiPagedList'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

export interface DiagramFilters {
  kind?: Diagram['kind']
  createdBy?: string
  instrumentId?: string
  skillId?: string
  conceptId?: string
}

/**
 * One page at a time of the diagrams the caller may discover. `filters` is
 * read on every request, so after changing what it returns call `reload`
 * to start over from the first page.
 */
export function useListDiagrams(filters: () => DiagramFilters = () => ({})) {
  const { items: diagrams, ...rest } = useApiPagedList<Diagram>((coreApi, page) => {
    const f = filters()
    return coreApi.GET('/diagrams', {
      params: {
        query: {
          ...page,
          ...(f.kind ? { kind: f.kind } : {}),
          ...(f.createdBy ? { created_by: f.createdBy } : {}),
          ...(f.instrumentId ? { instrument_id: f.instrumentId } : {}),
          ...(f.skillId ? { skill_id: f.skillId } : {}),
          ...(f.conceptId ? { concept_id: f.conceptId } : {}),
        },
      },
    })
  })

  return { diagrams, ...rest }
}
