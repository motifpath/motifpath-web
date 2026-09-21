import { useApiMutation } from '@/shared/composables/useApiMutation'
import type { components } from '@/api/generated/core-domain'

type CreateSkillRequest = components['schemas']['CreateSkillRequest']
type Skill = components['schemas']['Skill']

export function useCreateSkill() {
  const createSkill = useApiMutation<[CreateSkillRequest], Skill>(
    (coreApi, request) => coreApi.POST('/skills', { body: request }),
    'Failed to create the skill',
  )

  return { createSkill }
}
