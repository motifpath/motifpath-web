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

  it('rejects the bridge routes themselves as redirect targets — never real destinations', () => {
    expect(readRedirectQuery('/sign-in')).toBeUndefined()
    expect(readRedirectQuery('/welcome')).toBeUndefined()
    expect(readRedirectQuery('/welcome/error')).toBeUndefined()
  })

  it('still accepts a real destination that merely starts with a bridge path segment', () => {
    expect(readRedirectQuery('/welcome-back')).toBe('/welcome-back')
  })
})
