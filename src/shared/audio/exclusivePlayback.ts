/**
 * Only one thing plays at a time: a diagram, a progression, whatever plays next stops whichever
 * was playing. Each player claims the slot when it starts and releases it when it stops.
 */
let stopCurrent: (() => void) | null = null

/** Stops whatever is playing, then makes `stop` the way to stop what plays now. */
export function claimPlayback(stop: () => void) {
  stopCurrent?.()
  stopCurrent = stop
}

/** Gives the slot up, if `stop` still holds it. */
export function releasePlayback(stop: () => void) {
  if (stopCurrent === stop) stopCurrent = null
}

/** Stops whatever is playing, such as when a clip starts sounding instead. */
export function stopAnyPlayback() {
  stopCurrent?.()
}
