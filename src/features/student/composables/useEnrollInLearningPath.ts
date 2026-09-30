import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type StudentPath = components['schemas']['StudentPath']

export function useEnrollInLearningPath() {
  const { coreApi } = useApi()

  /**
   * Enrolls the learner in a published path, which always becomes their
   * current path. Enrolling again is never refused: the server hands back the
   * active copy the learner already holds instead of making a second one.
   */
  async function enrollInLearningPath(learningPathId: string): Promise<StudentPath> {
    const { data, error } = await coreApi.POST('/students/me/student-paths', {
      body: { learning_path_id: learningPathId },
    })
    if (data) return data
    throw new Error(describeApiError(error, 'Failed to enroll in the learning path'))
  }

  return { enrollInLearningPath }
}
