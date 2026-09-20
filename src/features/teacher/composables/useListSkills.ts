import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type Skill = components['schemas']['Skill']

export function useListSkills() {
  const { items: skills, isLoading, error, retry } = useApiList<Skill>((coreApi) => coreApi.GET('/skills', {}))

  return { skills, isLoading, error, retry }
}
