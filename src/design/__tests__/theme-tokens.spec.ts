import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import tokens from '@/design/tokens.json'

const cssText = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')

function hexToRgbChannels(hex: string): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.substring(0, 2), 16)
  const g = parseInt(value.substring(2, 4), 16)
  const b = parseInt(value.substring(4, 6), 16)
  return `${r} ${g} ${b}`
}

/**
 * `main.css`'s custom properties are a hand-authored projection of
 * `tokens.json` (CSS can't import JSON at runtime). This test is the drift
 * guard: it recomputes every expected value from the token file and asserts
 * the CSS text contains it, catching either file changing without the other.
 */
describe('theme token CSS custom properties', () => {
  const rootBlock = cssText.match(/:root\s*{([^}]*)}/)?.[1] ?? ''
  const darkBlock = cssText.match(/:root\.dark\s*{([^}]*)}/)?.[1] ?? ''

  it('extracted both :root and :root.dark blocks from main.css', () => {
    expect(rootBlock).not.toBe('')
    expect(darkBlock).not.toBe('')
  })

  for (const [role, def] of Object.entries(tokens.color)) {
    if (role.startsWith('$')) continue
    const value = (def as { $value: { light: string; dark: string } }).$value

    it(`--color-${role} matches tokens.json in light and dark`, () => {
      expect(rootBlock).toContain(`--color-${role}: ${hexToRgbChannels(value.light)};`)
      expect(darkBlock).toContain(`--color-${role}: ${hexToRgbChannels(value.dark)};`)
    })
  }

  for (const [role, def] of Object.entries(tokens.elevation)) {
    if (role.startsWith('$')) continue
    const value = (def as { $value: { light: string; dark: string } }).$value

    it(`--elevation-${role} matches tokens.json in light and dark`, () => {
      expect(rootBlock).toContain(`--elevation-${role}: ${value.light};`)
      expect(darkBlock).toContain(`--elevation-${role}: ${value.dark};`)
    })
  }
})
