import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('index.html', () => {
  it('draws the page edge to edge, under the status bar and the home indicator, so the page can pad by the insets', () => {
    const html = readFileSync(resolve(__dirname, '../../index.html'), 'utf8')
    const viewport = new DOMParser().parseFromString(html, 'text/html').querySelector('meta[name="viewport"]')

    expect(viewport?.getAttribute('content')).toContain('viewport-fit=cover')
  })
})
