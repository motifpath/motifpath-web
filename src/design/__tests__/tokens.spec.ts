import { describe, expect, it } from 'vitest'

import tokens from '@/design/tokens.json'

type Theme = 'light' | 'dark'
type ColorRole = keyof typeof tokens.color

function colorOf(role: ColorRole, theme: Theme): string {
  return (tokens.color[role] as { $value: Record<Theme, string> }).$value[theme]
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )
  return (lighter + 0.05) / (darker + 0.05)
}

// WCAG AA for body text. Subtle text carries real content (locked steps,
// captions), so it holds to the same floor as any other text.
const TEXT_CONTRAST_FLOOR = 4.5

const textPairs: Array<[ColorRole, ColorRole]> = [
  ['ink-subtle', 'surface'],
  ['ink-subtle', 'surface-raised'],
  ['warning', 'warning-muted'],
]

describe('design tokens', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const [text, background] of textPairs) {
      it(`${text} on ${background} reads at WCAG AA in the ${theme} theme`, () => {
        const ratio = contrastRatio(colorOf(text, theme), colorOf(background, theme))
        expect(ratio).toBeGreaterThanOrEqual(TEXT_CONTRAST_FLOOR)
      })
    }
  }

  it('has a scrim colour for sheets and dialogs, darker in the dark theme', () => {
    expect(tokens.color).toHaveProperty('scrim')
    expect(colorOf('scrim', 'light')).toBe('#0F0D1F')
    expect(colorOf('scrim', 'dark')).toBe('#000000')
  })

})
