import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'

/** True inside the iOS or Android app shell, false in a browser. */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

let initialized: Promise<void> | null = null

function initializeGoogle(): Promise<void> {
  initialized ??= SocialLogin.initialize({
    google: {
      // The ID token's audience is the Web client on both platforms, and it must be the same
      // client the auth provider's Google connection uses, or the token is refused.
      webClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      iOSClientId: import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID,
      iOSServerClientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID,
      mode: 'online',
    },
  })
  return initialized
}

/** Shows the platform's own Google account picker and resolves the signed-in account's ID token. */
export async function nativeGoogleIdToken(): Promise<string> {
  await initializeGoogle()
  const login = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } })
  const result = login.result
  if (!('idToken' in result) || !result.idToken) throw new Error('Google returned no ID token')
  return result.idToken
}
