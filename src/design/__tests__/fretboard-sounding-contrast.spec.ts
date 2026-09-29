import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const cssText = readFileSync(resolve(process.cwd(), 'src/assets/main.css'), 'utf8')
const themes = {
  light: cssText.match(/:root\s*{([^}]*)}/)?.[1] ?? '',
  dark: cssText.match(/:root\.dark\s*{([^}]*)}/)?.[1] ?? '',
}

function channels(block: string, name: string): [number, number, number] {
  const match = new RegExp(`--color-${name}:\\s*(\\d+) (\\d+) (\\d+);`).exec(block)
  if (!match) throw new Error(`--color-${name} is not defined`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** WCAG relative luminance and contrast ratio. */
function luminance([r, g, b]: [number, number, number]): number {
  const linear = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}
function contrast(a: [number, number, number], b: [number, number, number]): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (light + 0.05) / (dark + 0.05)
}

// A sounding position is ringed with a bright band in this color, edged in its own edge color. The
// band must stand out from its edge, and the band or its edge from every wood tone, in both themes
// (3:1, as a non-text graphic): a light theme's tan wood leaves no bright color that contrasts with
// it on its own, so there the dark edge carries the contrast and the band the highlight.
describe('the fretboard sounding colors', () => {
  for (const [theme, block] of Object.entries(themes)) {
    const band = () => channels(block, 'fretboard-sounding')
    const edge = () => channels(block, 'fretboard-sounding-edge')

    it(`sets the band apart from its edge in the ${theme} theme`, () => {
      expect(contrast(band(), edge())).toBeGreaterThanOrEqual(3)
    })

    for (const wood of ['fretboard-wood', 'fretboard-wood-edge']) {
      it(`stands out from --color-${wood} in the ${theme} theme`, () => {
        const best = Math.max(contrast(band(), channels(block, wood)), contrast(edge(), channels(block, wood)))
        expect(best).toBeGreaterThanOrEqual(3)
      })
    }
  }
})
