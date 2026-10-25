import { loadClerkJSScript } from '@clerk/shared/loadClerkJsScript'

// Inside the app shell, the auth provider's cookies are third-party to the page and never stored,
// so the signed-in client would be lost on every launch. Instead the client token travels in the
// `authorization` header and is kept by the app between launches.
const CLIENT_TOKEN_KEY = 'motifpath.clerk-client-token'

interface FapiRequest {
  credentials?: RequestCredentials
  url?: URL
  headers?: Headers
}

interface NativeHooks {
  __internal_onBeforeRequest: (hook: (request: FapiRequest) => Promise<void> | void) => void
  __internal_onAfterResponse: (hook: (request: FapiRequest, response?: Response) => Promise<void> | void) => void
}

function hasNativeHooks(candidate: unknown): candidate is NativeHooks {
  if (typeof candidate !== 'object' || candidate === null) return false
  return (
    typeof Reflect.get(candidate, '__internal_onBeforeRequest') === 'function' &&
    typeof Reflect.get(candidate, '__internal_onAfterResponse') === 'function'
  )
}

/**
 * Loads the auth script ahead of the Vue plugin and teaches it to keep its client token in app
 * storage instead of cookies. The plugin then reuses the already-loaded script.
 */
export async function prepareNativeClerkClient(publishableKey: string): Promise<void> {
  await loadClerkJSScript({ publishableKey })
  const clerk: unknown = Reflect.get(window, 'Clerk')
  if (!hasNativeHooks(clerk)) {
    const names = new Set<string>()
    for (let o: unknown = clerk; o && o !== Object.prototype; o = Object.getPrototypeOf(o)) {
      for (const name of Object.getOwnPropertyNames(o)) if (/unstable|request|response|native|fapi/i.test(name)) names.add(name)
    }
    console.log('[probe] clerk type', typeof clerk, 'matching members', [...names].join(','))
    throw new Error('the auth script has no native request hooks')
  }

  clerk.__internal_onBeforeRequest((request) => {
    request.credentials = 'omit'
    request.url?.searchParams.append('_is_native', '1')
    request.headers?.set('authorization', localStorage.getItem(CLIENT_TOKEN_KEY) ?? '')
  })
  clerk.__internal_onAfterResponse((_request, response) => {
    const token = response?.headers.get('authorization')
    console.log('[probe] fapi', _request.url?.toString(), response?.status, 'auth header', token ? 'yes' : 'no')
    if (response && response.status >= 400) {
      console.log('[probe] fapi request headers', JSON.stringify([..._request.headers?.entries() ?? []]), 'bodyUsed', response.bodyUsed)
      try {
        void response
          .clone()
          .text()
          .then(
            (body) => console.log('[probe] fapi body', body.slice(0, 400)),
            (error: unknown) => console.log('[probe] fapi body failed', String(error)),
          )
      } catch (error) {
        console.log('[probe] fapi clone failed', String(error))
      }
    }
    if (token) localStorage.setItem(CLIENT_TOKEN_KEY, token)
  })
}
