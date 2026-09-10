import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

import tokens from './src/design/tokens.json'

/**
 * Design tokens for MotifPath.
 *
 * Values come from `src/design/tokens.json` — the single source of truth for the
 * spike. Those values are PLACEHOLDERS; the real palette/scale is a
 * `motifpath-brand` decision (PB-34 phase 2). Components must reference token
 * names (e.g. `bg-surface`, `text-ink`, `text-ink/60`) — never raw hex/px.
 */

// tokens.json types `font.size` entries as `string[]`; Tailwind wants the
// `[fontSize, lineHeight]` tuple. Narrow it here rather than in the JSON.
const fontSize = Object.fromEntries(
  Object.entries(tokens.font.size).map(([name, [size, lineHeight]]) => [
    name,
    [size, lineHeight] as [string, string],
  ]),
)

const config: Config = {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ...tokens.color,
        // Retained placeholder aliases so PB-8c/8d markup keeps compiling until
        // the phase-2 restyle migrates every `motif-*` reference.
        'motif-blue': { DEFAULT: tokens.color.accent, fg: tokens.color['accent-fg'] },
        'motif-ink': tokens.color.ink,
        'motif-cream': tokens.color.surface,
        'motif-success': tokens.color.success,
        'motif-danger': tokens.color.danger,
      },
      fontSize,
      spacing: tokens.space,
      borderRadius: tokens.radius,
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

export default config
