import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

export function useDiagram(diagramId: string) {
  const { coreApi } = useApi()

  const diagram = ref<Diagram | null>(null)
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/diagrams/{diagram_id}', {
      params: { path: { diagram_id: diagramId } },
    })
    if (result.error || !result.data) {
      error.value = true
      diagram.value = null
    } else {
      diagram.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { diagram, isLoading, error, retry: load }
}
