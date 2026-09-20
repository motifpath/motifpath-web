import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type CreateSkillRequest = components['schemas']['CreateSkillRequest']
type Skill = components['schemas']['Skill']

export function useCreateSkill() {
  const { coreApi } = useApi()

  async function createSkill(request: CreateSkillRequest): Promise<Skill> {
    const { data, error } = await coreApi.POST('/skills', { body: request })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to create the skill'))
    }
    return data
  }

  return { createSkill }
}
