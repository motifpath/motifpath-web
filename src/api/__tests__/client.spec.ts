import { describe, expect, it, vi } from 'vitest'

import type { paths } from '@/api/generated/core-domain'
import { createApiClient } from '@/api/createApiClient'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function fakeFetch() {
  return vi.fn<(input: Request) => Promise<Response>>(async () => jsonResponse({ user_id: 'u_1' }))
}

describe('createApiClient', () => {
  it('sends requests to the configured base URL', async () => {
    const fetchSpy = fakeFetch()
    const client = createApiClient<paths>({
      baseUrl: 'https://core.example.test',
      getToken: async () => 'test-jwt',
      fetch: fetchSpy,
    })

    await client.GET('/users/me')

    expect(fetchSpy.mock.calls[0][0].url).toBe('https://core.example.test/users/me')
  })

  it('attaches the bearer token from the token getter', async () => {
    const fetchSpy = fakeFetch()
    const client = createApiClient<paths>({
      baseUrl: 'https://core.example.test',
      getToken: async () => 'test-jwt',
      fetch: fetchSpy,
    })

    await client.GET('/users/me')

    expect(fetchSpy.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer test-jwt')
  })

  it('omits the Authorization header when no token is available', async () => {
    const fetchSpy = fakeFetch()
    const client = createApiClient<paths>({
      baseUrl: 'https://core.example.test',
      getToken: async () => null,
      fetch: fetchSpy,
    })

    await client.GET('/users/me')

    expect(fetchSpy.mock.calls[0][0].headers.has('Authorization')).toBe(false)
  })

  it('resolves the token on every request, not once at construction', async () => {
    const getToken = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce('jwt-1')
      .mockResolvedValueOnce('jwt-2')
    const fetchSpy = fakeFetch()
    const client = createApiClient<paths>({
      baseUrl: 'https://core.example.test',
      getToken,
      fetch: fetchSpy,
    })

    await client.GET('/users/me')
    await client.GET('/users/me')

    expect(fetchSpy.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer jwt-1')
    expect(fetchSpy.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer jwt-2')
  })
})
