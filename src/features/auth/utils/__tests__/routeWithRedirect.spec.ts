import { describe, expect, it } from 'vitest'

import { routeWithRedirect } from '@/features/auth/utils/routeWithRedirect'

describe('routeWithRedirect', () => {
  it('carries a redirect query when one is given', () => {
    expect(routeWithRedirect('sign-in', '/path')).toEqual({
      name: 'sign-in',
      query: { redirect: '/path' },
    })
  })

  it('omits the query entirely when there is nothing to redirect to', () => {
    expect(routeWithRedirect('sign-in', undefined)).toEqual({ name: 'sign-in' })
  })
})
