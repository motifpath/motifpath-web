import { describe, expect, it } from 'vitest'

import { COLOR_PALETTE, isPaletteColor } from '@/shared/utils/colorPalette'

describe('COLOR_PALETTE', () => {
  it('has unique keys and unique #RRGGBB hex values', () => {
    expect(new Set(COLOR_PALETTE.map((c) => c.key)).size).toBe(COLOR_PALETTE.length)
    expect(new Set(COLOR_PALETTE.map((c) => c.hex)).size).toBe(COLOR_PALETTE.length)
    for (const { hex } of COLOR_PALETTE) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })
})

describe('isPaletteColor', () => {
  it('matches palette hex values case-insensitively', () => {
    expect(isPaletteColor(COLOR_PALETTE[0].hex.toLowerCase())).toBe(true)
  })

  it('rejects null, undefined, and colors outside the palette', () => {
    expect(isPaletteColor(null)).toBe(false)
    expect(isPaletteColor(undefined)).toBe(false)
    expect(isPaletteColor('#123456')).toBe(false)
  })
})
