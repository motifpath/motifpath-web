/**
 * Which color a diagram marker is drawn in: a position's own color wins,
 * then the diagram's general color; null means "use the renderer's default".
 * (A `DiagramRef.styling` override, when present, is applied on top of this
 * by the viewer — it is not part of the persisted diagram.)
 */
export function resolveMarkerColor(
  positionColor: string | null | undefined,
  diagramColor: string | null | undefined,
): string | null {
  return positionColor ?? diagramColor ?? null
}

const DARK_TEXT = '#1A1A1A'
const LIGHT_TEXT = '#F4F4F4'

function linearChannel(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string): number {
  const value = Number.parseInt(hex.slice(1), 16)
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b)
}

function contrast(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

/** Dark or light label text — whichever has the higher WCAG contrast on `hex` (#RRGGBB). */
export function readableTextColor(hex: string): string {
  const background = relativeLuminance(hex)
  const dark = contrast(background, relativeLuminance(DARK_TEXT))
  const light = contrast(background, relativeLuminance(LIGHT_TEXT))
  return dark >= light ? DARK_TEXT : LIGHT_TEXT
}
