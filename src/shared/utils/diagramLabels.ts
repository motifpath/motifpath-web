import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']
type LabelDisplay = components['schemas']['Diagram']['label_display']

/** What a usage's drawn markers show. */
export type DiagramLabelMode = NonNullable<DiagramRef['layers']['label']>

/** Which of a marker's texts to draw; null draws none. */
export type MarkerTextKind = 'interval' | 'note' | 'custom' | null

/**
 * The label mode a ref draws with. A ref from before label modes existed
 * has only `intervals`, and keeps drawing as it always did: off, or on a
 * diagram whose own display hides labels, draws nothing; otherwise a
 * position's custom label over the diagram's own label display — which is
 * the custom mode.
 */
export function effectiveLabelMode(ref: DiagramRef, labelDisplay: LabelDisplay): DiagramLabelMode {
  if (ref.layers.label) return ref.layers.label
  return ref.layers.intervals === false || labelDisplay === 'hidden' ? 'none' : 'custom'
}

/**
 * The text one marker shows in `mode`: custom falls back, for a position
 * without a custom label, to what the diagram's own label display shows.
 */
export function markerTextKind(mode: DiagramLabelMode, hasCustomLabel: boolean, labelDisplay: LabelDisplay): MarkerTextKind {
  switch (mode) {
    case 'interval':
    case 'note':
      return mode
    case 'none':
      return null
    case 'custom':
      if (hasCustomLabel) return 'custom'
      return labelDisplay === 'hidden' ? null : labelDisplay
  }
}
