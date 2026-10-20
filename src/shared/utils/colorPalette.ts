/**
 * The fixed set of colors MotifPath authoring UIs offer (diagram markers and
 * rich-text color/background/cell fills). Values are stored as #RRGGBB hex;
 * the palette itself is a web concern, so it can grow without a data change.
 */
export const COLOR_PALETTE = [
  { key: 'red', hex: '#EF4444' },
  { key: 'orange', hex: '#F97316' },
  { key: 'amber', hex: '#F59E0B' },
  { key: 'green', hex: '#22C55E' },
  { key: 'teal', hex: '#14B8A6' },
  { key: 'blue', hex: '#3B82F6' },
  { key: 'indigo', hex: '#6366F1' },
  { key: 'purple', hex: '#A855F7' },
  { key: 'pink', hex: '#EC4899' },
  { key: 'gray', hex: '#6B7280' },
  { key: 'black', hex: '#111827' },
  { key: 'white', hex: '#FFFFFF' },
] as const

export type PaletteColorKey = (typeof COLOR_PALETTE)[number]['key']

export function isPaletteColor(color: string | null | undefined): boolean {
  if (!color) return false
  const upper = color.toUpperCase()
  return COLOR_PALETTE.some((c) => c.hex === upper)
}
