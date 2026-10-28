import { Clerk } from '@clerk/clerk-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CLERK_JS_VERSION, keepClientTokenIn } from '@/features/auth/utils/clerkClientToken'
import { webSecureStorage, type SecureStoragePort } from '@/shared/platform/secureStorage'

const TOKEN_KEY = 'motifpath.clerk-client-token'

interface SentRequest {
  url: URL
  authorization: string | null
  credentials: RequestCredentials | undefined
}

/** How Clerk's Frontend API answers every request of one launch. */
interface Reply {
  status: number
  /** The client token it hands back in the `authorization` header, if any. */
  clientToken?: string
}

/** Stands in for Clerk's Frontend API, recording what each request carried. */
function fakeFrontendApi(reply: Reply): SentRequest[] {
  const sent: SentRequest[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL, init: RequestInit) => {
      sent.push({
        url,
        authorization: new Headers(init.headers).get('authorization'),
        credentials: init.credentials,
      })
      const headers = new Headers({ 'content-type': 'application/json' })
      if (reply.clientToken) headers.set('authorization', reply.clientToken)
      return new Response(JSON.stringify({ response: {}, client: null }), { status: reply.status, headers })
    }),
  )
  return sent
}

/**
 * One launch of the app: the real clerk-js, at the pinned version, loads in native mode with the
 * client token kept in `storage`. Resolves the requests it sent and the keeper it installed.
 */
async function launch(storage: SecureStoragePort, reply: Reply = { status: 200 }) {
  const sent = fakeFrontendApi(reply)
  const clerk = new Clerk(`pk_test_${btoa('example.clerk.accounts.dev$')}`)
  const keeper = await keepClientTokenIn(clerk, storage)
  // The fake API's empty replies leave the load unfinished; only the requests matter here.
  await clerk.load({ standardBrowser: false }).catch(() => undefined)
  return { sent, keeper }
}

async function storageHolding(token: string | null): Promise<SecureStoragePort> {
  const storage = webSecureStorage()
  if (token) await storage.set(TOKEN_KEY, token)
  return storage
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('keepClientTokenIn', () => {
  it('runs against the clerk-js version the app loads', () => {
    expect(Clerk.version).toBe(CLERK_JS_VERSION)
  })

  it('sends the stored client token', async () => {
    const { sent } = await launch(await storageHolding('client-1'))

    expect(sent.map((request) => request.authorization)).toEqual(['client-1', 'client-1'])
  })

  it('keeps the client token Clerk hands back, and sends it at the next launch', async () => {
    const storage = await storageHolding(null)

    await launch(storage, { status: 200, clientToken: 'client-2' })
    const { sent } = await launch(storage)

    await expect(storage.get(TOKEN_KEY)).resolves.toBe('client-2')
    expect(sent[0]?.authorization).toBe('client-2')
  })

  it('asks for native replies and sends no cookies', async () => {
    const { sent } = await launch(await storageHolding('client-1'))

    expect(sent[0]?.url.searchParams.get('_is_native')).toBe('1')
    expect(sent[0]?.credentials).toBe('omit')
  })

  it('sends no client token before Clerk has handed one out', async () => {
    const { sent } = await launch(await storageHolding(null))

    expect(sent[0]?.authorization).toBeNull()
  })

  it.each([401, 403])('forgets a client token Clerk refuses with %i, so the next launch starts afresh', async (status) => {
    const storage = await storageHolding('client-1')

    await launch(storage, { status })
    const { sent } = await launch(storage)

    await expect(storage.get(TOKEN_KEY)).resolves.toBeNull()
    expect(sent[0]?.authorization).toBeNull()
  })

  it('forgets the client token on request, for signing out', async () => {
    const storage = await storageHolding('client-1')

    const { keeper } = await launch(storage)
    await keeper.forget()
    const { sent } = await launch(storage)

    await expect(storage.get(TOKEN_KEY)).resolves.toBeNull()
    expect(sent[0]?.authorization).toBeNull()
  })

  it('carries on when the device cannot store a new client token', async () => {
    const storage = { ...webSecureStorage(), set: vi.fn().mockRejectedValue(new Error('keychain locked')) }

    await expect(launch(storage, { status: 200, clientToken: 'client-2' })).resolves.toBeDefined()
  })

  it('refuses a Clerk without the request hooks, so a renamed internal API fails loudly', async () => {
    await expect(keepClientTokenIn({}, webSecureStorage())).rejects.toThrow('request hooks')
  })
})
