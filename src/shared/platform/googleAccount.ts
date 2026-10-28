import { SocialLogin } from '@capgo/capacitor-social-login'

/** The methods of the platform's Google sign-in that the account picker relies on. */
export interface GoogleSignInPlugin {
  initialize(options: unknown): Promise<void>
  logout(options: unknown): Promise<void>
  login(options: unknown): Promise<{ result: unknown }>
}

/** The Google OAuth clients the app signs in with. */
export interface GoogleClients {
  /** The token's audience on every platform; the same client the auth provider's Google connection uses. */
  webClientId: string
  /** The iOS app's own client, whose reversed ID is the URL scheme Google returns to. */
  iOSClientId: string
}

/** Opens the account picker and resolves the picked account's Google ID token. */
export type PickGoogleAccount = () => Promise<string>

function idTokenOf(result: unknown): string {
  const idToken = typeof result === 'object' && result !== null ? Reflect.get(result, 'idToken') : undefined
  if (typeof idToken !== 'string' || !idToken) throw new Error('Google returned no ID token')
  return idToken
}

/**
 * The platform's own Google account picker, inside the app shell. Rejects when the picker is closed
 * or the sign-in fails.
 */
export function googleAccountPicker(plugin: GoogleSignInPlugin, clients: GoogleClients): PickGoogleAccount {
  let initialized: Promise<void> | null = null

  return async () => {
    initialized ??= plugin.initialize({
      google: {
        webClientId: clients.webClientId,
        iOSClientId: clients.iOSClientId,
        iOSServerClientId: clients.webClientId,
        mode: 'online',
      },
    })
    await initialized
    // A Google sign-in restored on the device hands back the ID token it cached, which the auth
    // provider refuses as already used. Ending it first makes the picker issue a fresh one.
    await plugin.logout({ provider: 'google' }).catch(() => undefined)
    const login = await plugin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } })
    return idTokenOf(login.result)
  }
}

/** The account picker with the app's Google clients. */
export function platformGoogleAccountPicker(): PickGoogleAccount {
  return googleAccountPicker(SocialLogin, {
    webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
    iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID,
  })
}
