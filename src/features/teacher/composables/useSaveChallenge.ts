import { useCreateChallenge } from '@/features/teacher/composables/useCreateChallenge'
import {
  useLinkExerciseToChallenge,
  useUnlinkExerciseFromChallenge,
} from '@/features/teacher/composables/useLinkExerciseToChallenge'
import { useUpdateChallenge } from '@/features/teacher/composables/useUpdateChallenge'
import type { components } from '@/api/generated/core-domain'

type CreateChallengeRequest = components['schemas']['CreateChallengeRequest']
type Challenge = components['schemas']['Challenge']

export interface SaveChallengeInput {
  contentNodeId: string
  /** Present when editing an existing challenge; absent when creating one. */
  challengeId?: string
  fields: CreateChallengeRequest
  /** The full, ordered set of exercises the challenge should end up with. */
  exerciseIds: string[]
  /** The exercises currently linked server-side, to diff `exerciseIds` against. */
  linkedExerciseIds: string[]
}

/**
 * Saves a challenge together with its exercises as one teacher action. The API
 * creates/updates a challenge and links exercises through separate endpoints,
 * so this creates or updates first, then applies only the link difference.
 * A challenge with no exercises is unusable, so it is refused up front rather
 * than leaving an empty one behind.
 */
export function useSaveChallenge() {
  const { createChallenge } = useCreateChallenge()
  const { updateChallenge } = useUpdateChallenge()
  const { linkExerciseToChallenge } = useLinkExerciseToChallenge()
  const { unlinkExerciseFromChallenge } = useUnlinkExerciseFromChallenge()

  async function saveChallenge(input: SaveChallengeInput): Promise<Challenge> {
    if (input.exerciseIds.length === 0) {
      throw new Error('A challenge needs at least one exercise')
    }

    const challenge = input.challengeId
      ? await updateChallenge(input.challengeId, input.fields)
      : await createChallenge(input.contentNodeId, input.fields)

    const toUnlink = input.linkedExerciseIds.filter((id) => !input.exerciseIds.includes(id))
    const toLink = input.exerciseIds.filter((id) => !input.linkedExerciseIds.includes(id))

    // Sequential, not parallel: exercises are returned in link order.
    for (const exerciseId of toUnlink) {
      await unlinkExerciseFromChallenge(challenge.challenge_id, exerciseId)
    }
    for (const exerciseId of toLink) {
      await linkExerciseToChallenge(challenge.challenge_id, exerciseId)
    }

    return challenge
  }

  return { saveChallenge }
}
