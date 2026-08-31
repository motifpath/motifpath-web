import { describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { createAuthGuard } from '@/router/guards'

function route(partial: Partial<RouteLocationNormalized>): RouteLocationNormalized {
  return { meta: {}, fullPath: '/', ...partial } as RouteLocationNormalized
}

describe('createAuthGuard', () => {
  it('allows a public route without consulting auth', async () => {
    const isReady = vi.fn(() => Promise.resolve())
    const guard = createAuthGuard({ isReady, isSignedIn: () => false })

    const result = await guard(route({ fullPath: '/' }))

    expect(result).toBe(true)
    expect(isReady).not.toHaveBeenCalled()
  })

  it('waits for auth readiness before deciding a protected route', async () => {
    let resolveReady!: () => void
    const isReady = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveReady = resolve
        }),
    )
    const guard = createAuthGuard({ isReady, isSignedIn: () => true })

    const pending = guard(route({ meta: { requiresAuth: true }, fullPath: '/path' }))
    let settled = false
    void pending.then(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    resolveReady()
    expect(await pending).toBe(true)
  })

  it('redirects an unauthenticated user on a protected route to sign-in', async () => {
    const guard = createAuthGuard({ isReady: () => Promise.resolve(), isSignedIn: () => false })

    const result = await guard(route({ meta: { requiresAuth: true }, fullPath: '/path' }))

    expect(result).toEqual({ name: 'sign-in', query: { redirect: '/path' } })
  })

  it('lets an authenticated user through to a protected route', async () => {
    const guard = createAuthGuard({ isReady: () => Promise.resolve(), isSignedIn: () => true })

    const result = await guard(route({ meta: { requiresAuth: true }, fullPath: '/path' }))

    expect(result).toBe(true)
  })
})
