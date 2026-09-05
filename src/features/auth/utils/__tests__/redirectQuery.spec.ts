import { describe, expect, it } from 'vitest'

import { readRedirectQuery } from '@/features/auth/utils/redirectQuery'

describe('readRedirectQuery', () => {
  it('returns the value when it is a non-empty string', () => {
    expect(readRedirectQuery('/path')).toBe('/path')
  })

  it('returns undefined for an empty string', () => {
    expect(readRedirectQuery('')).toBeUndefined()
  })

  it('returns undefined for a non-string value', () => {
    expect(readRedirectQuery(undefined)).toBeUndefined()
    expect(readRedirectQuery(null)).toBeUndefined()
    expect(readRedirectQuery(['a', 'b'])).toBeUndefined()
  })
})
