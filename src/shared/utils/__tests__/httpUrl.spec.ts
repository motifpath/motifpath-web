import { describe, expect, it } from 'vitest'

import { isHttpUrl } from '@/shared/utils/httpUrl'

describe('isHttpUrl', () => {
  it.each([
    'https://cdn.example.com/lesson.mp4',
    'http://cdn.example.com/lesson.mp4',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'HTTPS://CDN.EXAMPLE.COM/lesson.mp4',
  ])('accepts %s', (value) => {
    expect(isHttpUrl(value)).toBe(true)
  })

  it.each([
    '',
    'not a url',
    '/videos/lesson.mp4',
    'cdn.example.com/lesson.mp4',
    'javascript:alert(1)',
    'ftp://cdn.example.com/lesson.mp4',
    'https://',
  ])('rejects %j', (value) => {
    expect(isHttpUrl(value)).toBe(false)
  })
})
