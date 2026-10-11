import type { LocationQuery, RouteLocationRaw } from 'vue-router'

/**
 * The way back to Where to start when a detail was opened from it — the home with the same
 * answers — or null when it was opened from anywhere else. The answers travel in the address only.
 */
export function whereToStartReturn(query: LocationQuery): RouteLocationRaw | null {
  const { startInstrument, startExperience } = query
  if (typeof startInstrument !== 'string' || !startInstrument || typeof startExperience !== 'string' || !startExperience) {
    return null
  }
  return { name: 'home', query: { instrument: startInstrument, experience: startExperience } }
}
