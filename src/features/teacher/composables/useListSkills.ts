import { ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import type { components } from '@/api/generated/core-domain'

type Skill = components['schemas']['Skill']

export function useListSkills() {
  const { coreApi } = useApi()

  const skills = ref<Skill[]>([])
  const isLoading = ref(false)
  const error = ref(false)

  async function load() {
    isLoading.value = true
    error.value = false

    const result = await coreApi.GET('/skills', {})
    if (result.error || !result.data) {
      error.value = true
      skills.value = []
    } else {
      skills.value = result.data
    }

    isLoading.value = false
  }

  void load()

  return { skills, isLoading, error, retry: load }
}
