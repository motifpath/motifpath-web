/**
 * Resolves the current session JWT for outbound API requests.
 *
 * Placeholder for the PB-8b foundation — always returns `null` (unauthenticated).
 * PB-8b Phase 4 replaces this with Clerk's session token accessor.
 */
export async function getAuthToken(): Promise<string | null> {
  return null
}
