import type { TakeRating } from '@/features/student/utils/tempoLadder'

/** The share of a minute's beats that must change cleanly for it to be clean, or almost. */
const CLEAN_SHARE = 0.9
const ALMOST_SHARE = 0.6

/**
 * How a minute of changes went, one change on every beat: not the student's judgement but the
 * share of the beats that changed cleanly, the clean changes counted over the tempo. The server
 * derives the same rating from the same two numbers.
 */
export function changeMinuteRating(cleanChanges: number, tempoBpm: number): TakeRating {
  const share = tempoBpm <= 0 ? 0 : cleanChanges / tempoBpm
  if (share >= CLEAN_SHARE) return 'clean'
  if (share >= ALMOST_SHARE) return 'almost'
  return 'struggled'
}
