/**
 * Bridges Clerk's session — which is only reachable from a component setup
 * context — to code that runs outside it: the API transport (per-request token)
 * and the router navigation guard (readiness + sign-in state).
 *
 * `App.vue` pushes the current state here via `updateAuthBridge` on every change.
 */

type TokenGetter = () => Promise<string | null>

let tokenGetter: TokenGetter = async () => null
let signedIn = false
let readyResolved = false
let resolveReady!: () => void
const readyPromise = new Promise<void>((resolve) => {
  resolveReady = resolve
})

export interface AuthBridgeState {
  isLoaded: boolean
  isSignedIn: boolean
  getToken: TokenGetter
}

export function updateAuthBridge(state: AuthBridgeState): void {
  tokenGetter = state.getToken
  signedIn = state.isSignedIn
  if (state.isLoaded && !readyResolved) {
    readyResolved = true
    resolveReady()
  }
}

/** Current session JWT for outbound API requests, or `null` when signed out. */
export function getAuthToken(): Promise<string | null> {
  return tokenGetter()
}

/** Read-only view of auth state for the router guard. */
export const authChecker = {
  isReady: (): Promise<void> => readyPromise,
  isSignedIn: (): boolean => signedIn,
}
