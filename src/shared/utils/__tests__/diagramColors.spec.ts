import { describe, expect, it } from 'vitest'

import { readableTextColor, resolveMarkerColor } from '@/shared/utils/diagramColors'
import { COLOR_PALETTE } from '@/shared/utils/colorPalette'

describe('resolveMarkerColor', () => {
  it('prefers the position color, then the general color, then null', () => {
    expect(resolveMarkerColor('#EF4444', '#3B82F6')).toBe('#EF4444')
    expect(resolveMarkerColor(null, '#3B82F6')).toBe('#3B82F6')
    expect(resolveMarkerColor(undefined, '#3B82F6')).toBe('#3B82F6')
    expect(resolveMarkerColor(null, null)).toBeNull()
    expect(resolveMarkerColor(undefined, undefined)).toBeNull()
  })
})

describe('readableTextColor', () => {
  it('uses dark text on light colors and light text on dark colors', () => {
    expect(readableTextColor('#FFFFFF')).toBe('#1A1A1A')
    expect(readableTextColor('#F59E0B')).toBe('#1A1A1A')
    expect(readableTextColor('#111827')).toBe('#F4F4F4')
    expect(readableTextColor('#3B82F6')).toBe('#1A1A1A')
    expect(readableTextColor('#6366F1')).toBe('#F4F4F4')
  })

  it('is case-insensitive and always returns a text color for every palette swatch', () => {
    expect(readableTextColor('#ffffff')).toBe('#1A1A1A')
    for (const { hex } of COLOR_PALETTE) {
      expect(['#1A1A1A', '#F4F4F4']).toContain(readableTextColor(hex))
    }
  })
})
