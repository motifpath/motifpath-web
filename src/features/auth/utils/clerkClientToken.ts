import type { SecureStoragePort } from '@/shared/platform/secureStorage'

/**
 * The clerk-js release the app loads. Pinned, because the app shell relies on its internal request
 * hooks, which a release has renamed before; the tests run against this same release.
 */
export const CLERK_JS_VERSION = '6.42.0'

const CLIENT_TOKEN_KEY = 'motifpath.clerk-client-token'

/** What Clerk's request hooks receive: the request about to go out, and its response once back. */
interface FrontendApiRequest {
  credentials?: RequestCredentials
  url?: URL
  headers?: HeadersInit
}

type FrontendApiHook = (request: FrontendApiRequest, response?: Response) => unknown

interface ClerkRequestHooks {
  __internal_onBeforeRequest: (hook: FrontendApiHook) => void
  __internal_onAfterResponse: (hook: FrontendApiHook) => void
}

function hasRequestHooks(clerk: unknown): clerk is ClerkRequestHooks {
  if (typeof clerk !== 'object' || clerk === null) return false
  return (
    typeof Reflect.get(clerk, '__internal_onBeforeRequest') === 'function' &&
    typeof Reflect.get(clerk, '__internal_onAfterResponse') === 'function'
  )
}

/** Refused means the client is gone: keeping the token would fail every later launch the same way. */
function refusesClient(response: Response): boolean {
  return response.status === 401 || response.status === 403
}

export interface ClientTokenKeeper {
  /** Forgets the client token on the device and in memory, so the next request starts a new client. */
  forget: () => Promise<void>
}

/**
 * Inside the app shell, Clerk's cookies are third-party to the page and never kept, so the signed-in
 * client would be lost at every launch. Instead Clerk's client token travels in the `authorization`
 * header, and is kept in secure storage between launches. Install before Clerk loads.
 */
export async function keepClientTokenIn(
  clerk: unknown,
  storage: SecureStoragePort,
): Promise<ClientTokenKeeper> {
  if (!hasRequestHooks(clerk)) throw new Error('Clerk has no request hooks to carry the client token')

  let clientToken = await storage.get(CLIENT_TOKEN_KEY)

  async function forget(): Promise<void> {
    clientToken = null
    await storage.remove(CLIENT_TOKEN_KEY)
  }

  async function keep(token: string): Promise<void> {
    clientToken = token
    // A token that can't be stored still serves this launch; the next one signs in again.
    await storage.set(CLIENT_TOKEN_KEY, token).catch(() => undefined)
  }

  clerk.__internal_onBeforeRequest((request) => {
    request.credentials = 'omit'
    request.url?.searchParams.set('_is_native', '1')
    if (clientToken && request.headers instanceof Headers) {
      request.headers.set('authorization', clientToken)
    }
  })

  clerk.__internal_onAfterResponse(async (_request, response) => {
    if (!response) return
    if (refusesClient(response)) {
      await forget()
      return
    }
    const token = response.headers.get('authorization')
    if (token && token !== clientToken) await keep(token)
  })

  return { forget }
}
