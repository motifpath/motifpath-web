import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

import tokens from './src/design/tokens.json'

/**
 * Design tokens for MotifPath (ADR-018 decision 1).
 *
 * Values come from `src/design/tokens.json`, copied from the resolved
 * `motifpath-brand/tokens.json` (PB-34 phase 2). Colours resolve through CSS
 * custom properties defined in `src/assets/main.css` (`:root` for light,
 * `:root.dark` for dark) rather than static hex, so `darkMode: 'class'` swaps
 * every token-based utility by toggling the `dark` class on `<html>` (see
 * `src/stores/theme.ts`). Components must reference token names (e.g.
 * `bg-surface`, `text-ink`, `text-ink/60`) — never raw hex/px.
 */

// Every scale in tokens.json is `{ $type, $value }` per entry (plus an
// optional sibling `$description` string to filter out). Tailwind wants the
// bare value.
function scaleValues<T>(scale: Record<string, unknown>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(scale)
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, def]) => [key, (def as { $value: T }).$value]),
  )
}

// tokens.json's font.size values are `[fontSize, lineHeight]` string tuples;
// Tailwind's fontSize wants that exact tuple type, not `string[]`.
const fontSize = Object.fromEntries(
  Object.entries(scaleValues<[string, string]>(tokens.font.size)).map(
    ([name, [size, lineHeight]]) => [name, [size, lineHeight] as [string, string]],
  ),
)

// Every semantic colour role becomes `rgb(var(--color-<role>) / <alpha-value>)`
// so opacity modifiers (e.g. `text-ink/60`) keep working against whichever
// theme's custom properties are active.
const colorRoles = Object.keys(tokens.color).filter((key) => !key.startsWith('$'))
const colors = Object.fromEntries(
  colorRoles.map((role) => [role, `rgb(var(--color-${role}) / <alpha-value>)`]),
)

// Elevation shadows are full box-shadow strings (already colour-complete per
// theme), so they resolve straight from the custom property.
const elevationRoles = Object.keys(tokens.elevation).filter((key) => !key.startsWith('$'))
const boxShadow = Object.fromEntries(elevationRoles.map((role) => [role, `var(--elevation-${role})`]))

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        // Retained placeholder aliases so PB-8c/8d markup keeps compiling
        // until the Phase 4 restyle migrates every `motif-*` reference.
        'motif-blue': { DEFAULT: colors.accent, fg: colors['accent-fg'] },
        'motif-ink': colors.ink,
        'motif-cream': colors.surface,
        'motif-success': colors.success,
        'motif-danger': colors.danger,
      },
      fontSize,
      spacing: scaleValues<string>(tokens.space),
      borderRadius: scaleValues<string>(tokens.radius),
      boxShadow,
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

export default config
