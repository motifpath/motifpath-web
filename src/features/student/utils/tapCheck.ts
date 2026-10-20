/**
 * The tap check: about 20 seconds of tapping a highlighted fret as soon as it lights up. Its
 * median tap time is how long a tap takes the student when there's nothing to work out, which the
 * server takes off their later timed answers.
 */

/** How long the tap check runs. */
export const TAP_CHECK_MS = 20_000

/** The median of the tap times, in whole milliseconds; null without taps. */
export function medianTapMs(tapTimes: number[]): number | null {
  if (tapTimes.length === 0) return null
  const sorted = [...tapTimes].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const median = sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
  return Math.round(median)
}
