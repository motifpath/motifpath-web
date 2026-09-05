import type { CurrentUserState } from '@/stores/currentUser'

/**
 * Defensively starts registration only if it hasn't started at all yet.
 * Shared by RegisteringView and RegistrationErrorView so both make the same
 * promise: never silently restart a genuinely 'failed' or already-'registering'
 * attempt — "Try again" is the only thing that retries a failure, not a
 * remount (e.g. reaching /welcome again via the browser back button).
 */
export function ensureIfIdle(currentUser: {
  state: CurrentUserState
  ensure: () => Promise<void>
}): void {
  if (currentUser.state === 'idle') {
    void currentUser.ensure()
  }
}
