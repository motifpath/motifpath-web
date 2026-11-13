import type { components } from '@/api/generated/event-ingestion'
import type { TakeRating } from '@/features/student/utils/tempoLadder'

/** A share of a take's changes that rang clean, in percent, as the student picks it. */
export type CleanShare = NonNullable<components['schemas']['SelfRatingResponse']['clean_share_percent']>

/** The shares a student picks a take of changes' from, in quarters. */
export const CLEAN_SHARES: readonly CleanShare[] = [25, 50, 75, 100]

/**
 * How a take of changes went: not the student's judgement but the share of its changes that rang
 * clean. Every change clean is clean, three in four almost, half or fewer a struggle. The server
 * derives the same rating from the same share.
 */
export function changeShareRating(share: CleanShare): TakeRating {
  if (share >= 100) return 'clean'
  if (share >= 75) return 'almost'
  return 'struggled'
}
