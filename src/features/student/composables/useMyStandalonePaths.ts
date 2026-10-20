import { useApiList } from '@/shared/composables/useApiList'
import type { components } from '@/api/generated/core-domain'

type StudentPath = components['schemas']['StudentPath']

/** The student's paths that belong to no course, active and archived alike. */
export function useMyStandalonePaths() {
  const {
    items: paths,
    isLoading,
    error,
    retry,
  } = useApiList<StudentPath>((coreApi) => coreApi.GET('/students/me/student-paths', {}))

  return { paths, isLoading, error, retry }
}
