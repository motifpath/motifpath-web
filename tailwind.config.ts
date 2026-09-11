import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'

/**
 * Design tokens for MotifPath.
 *
 * The `motif-*` color values are PLACEHOLDERS. The brand palette is still `TBD`
 * in `motifpath-brand/colors.json`; replace these hex values once the brand
 * tokens are finalised. Components must reference the token names (e.g.
 * `bg-motif-blue`, `text-motif-ink`) — never raw hex values.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        'motif-blue': {
          DEFAULT: '#1d4ed8',
          fg: '#f8f5ec',
        },
        'motif-ink': '#1a1a2e',
        'motif-cream': '#f8f5ec',
        // Semantic status roles (PB-8j §"Semantic token roles"). PLACEHOLDER
        // hex — the real values are a motifpath-brand decision, tracked in
        // that section's action items alongside the other `motif-*` tokens.
        'motif-success': '#15803d',
        'motif-danger': '#b91c1c',
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}

export default config
