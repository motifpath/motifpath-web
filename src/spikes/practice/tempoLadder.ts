/**
 * The tempo ladder for play-along items: enough clean takes in a row at one
 * tempo move it up a step, a struggle moves it down, anything else holds.
 */
import type { PlayAlongParams, Rating } from '@/spikes/practice/model'

export const MIN_BPM = 40

export interface Take {
  bpm: number
  rating: Rating
}

function clamp(bpm: number, params: PlayAlongParams): number {
  return Math.min(params.target_bpm, Math.max(MIN_BPM, bpm))
}

/** The tempo for the next take, given this session's takes so far (oldest first). */
export function nextBpm(params: PlayAlongParams, takes: Take[], startBpm: number): number {
  const last = takes.at(-1)
  if (!last) return clamp(startBpm, params)
  if (last.rating === 'struggled') return clamp(last.bpm - params.step_bpm, params)
  if (last.rating === 'almost') return clamp(last.bpm, params)
  let cleanRun = 0
  for (let i = takes.length - 1; i >= 0; i--) {
    const take = takes[i]!
    if (take.bpm !== last.bpm || take.rating !== 'clean') break
    cleanRun++
  }
  return clamp(cleanRun >= params.cleans_to_advance ? last.bpm + params.step_bpm : last.bpm, params)
}

/**
 * Where a session starts: at the best clean tempo. Starting lower would spend the
 * session's takes climbing back, and the student would never pass their best.
 */
export function startingBpm(params: PlayAlongParams, bestCleanBpm: number | null): number {
  if (bestCleanBpm === null) return params.start_bpm
  return Math.min(params.target_bpm, Math.max(params.start_bpm, bestCleanBpm))
}
