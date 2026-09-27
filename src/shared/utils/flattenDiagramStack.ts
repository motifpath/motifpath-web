import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramPosition = components['schemas']['DiagramPosition']
type DiagramRegion = components['schemas']['DiagramRegion']
type LocalizedNames = components['schemas']['LocalizedNames']

/** One diagram in a stack: the base being authored, or a diagram overlaid on it. */
export interface StackLayer {
  names: LocalizedNames
  /** The layer's general marker color; null = the renderer's default. */
  color: string | null
  positions: DiagramPosition[]
  regions: DiagramRegion[]
  skillIds: string[]
  conceptIds: string[]
}

/** What flattening a stack yields; the diagram-level fields stay the base's own. */
export interface FlattenedStack {
  /** Without position ids, which are left for the server (or the form) to assign. */
  positions: DiagramPosition[]
  /** Without region ids, for the same reason. */
  regions: DiagramRegion[]
  skillIds: string[]
  conceptIds: string[]
}

export interface FlattenOptions {
  /** The flattened diagram's languages (the base's); layer text in any other language is dropped. */
  languages: string[]
  /** Adds one highlighted region per layer, spanning its frets and captioned with its names. */
  regionPerLayer: boolean
}

export function stackLayerFromDiagram(diagram: Diagram): StackLayer {
  return {
    names: diagram.names,
    color: diagram.color ?? null,
    positions: diagram.positions,
    // A diagram served by an older API has no regions field at all.
    regions: diagram.regions ?? [],
    skillIds: diagram.classification.skills.map((s) => s.skill_id),
    conceptIds: diagram.classification.concepts.map((c) => c.concept_id),
  }
}

/** The trimmed, filled-in text of `text` in `languages`. */
function inLanguages(text: LocalizedNames | undefined, languages: string[]): LocalizedNames {
  return Object.fromEntries(
    languages
      .map((code) => [code, (text?.[code] ?? '').trim()] as const)
      .filter(([, value]) => value !== ''),
  )
}

/** Where a position sits on the instrument; two layers marking the same place overlap. */
function locationKey(position: DiagramPosition): string {
  return position.key !== undefined ? `key:${position.key}` : `fret:${position.string}:${position.fret}`
}

function bySequence(a: DiagramPosition, b: DiagramPosition): number {
  return (a.sequence_index ?? Number.POSITIVE_INFINITY) - (b.sequence_index ?? Number.POSITIVE_INFINITY)
}

function flattenPosition(position: DiagramPosition, layerColor: string | null, languages: string[]): DiagramPosition {
  const customLabel = inLanguages(position.custom_label, languages)
  const noteText = inLanguages(position.note, languages)
  const color = position.color ?? layerColor
  return {
    interval: position.interval,
    note_name: position.note_name,
    shape: position.shape,
    ...(color ? { color } : {}),
    sequence_index: position.sequence_index,
    ...(position.string !== undefined ? { string: position.string } : {}),
    ...(position.fret !== undefined ? { fret: position.fret } : {}),
    ...(position.key !== undefined ? { key: position.key } : {}),
    ...(Object.keys(customLabel).length > 0 ? { custom_label: customLabel } : {}),
    ...(Object.keys(noteText).length > 0 ? { note: noteText } : {}),
  }
}

function carriedRegion(region: DiagramRegion, languages: string[]): DiagramRegion {
  return {
    ...(region.fret_start !== undefined ? { fret_start: region.fret_start } : {}),
    ...(region.fret_end !== undefined ? { fret_end: region.fret_end } : {}),
    ...(region.string_start !== undefined ? { string_start: region.string_start } : {}),
    ...(region.string_end !== undefined ? { string_end: region.string_end } : {}),
    ...(region.key_start !== undefined ? { key_start: region.key_start } : {}),
    ...(region.key_end !== undefined ? { key_end: region.key_end } : {}),
    description: inLanguages(region.description, languages),
    color: region.color,
  }
}

/** A band over every string from the layer's lowest to highest fret; none for a layer without frets. */
function layerRegion(layer: StackLayer, languages: string[]): DiagramRegion | null {
  const frets = layer.positions.map((p) => p.fret).filter((fret): fret is number => fret !== undefined)
  if (frets.length === 0) return null
  return {
    fret_start: Math.min(...frets),
    fret_end: Math.max(...frets),
    description: inLanguages(layer.names, languages),
    color: layer.color,
  }
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)]
}

/**
 * Merges a stack of diagrams into one position list. `layers[0]` is the base and
 * the rest are overlays in the order they were added, painted bottom to top:
 * where two layers mark the same place only the top one's position is kept.
 * Positions keep their own interval and note name (never recomputed against
 * the base's root), and their color is resolved from their layer. The result is
 * sequenced base first, then each overlay in its own order. Generated per-layer
 * regions come before the carried ones, so the narrower authored bands draw on top.
 */
export function flattenDiagramStack(layers: StackLayer[], options: FlattenOptions): FlattenedStack {
  const { languages, regionPerLayer } = options

  const byLocation = new Map<string, DiagramPosition>()
  for (const layer of layers) {
    for (const position of [...layer.positions].sort(bySequence)) {
      const key = locationKey(position)
      // Delete first so a covering position takes the top layer's place in the order.
      byLocation.delete(key)
      byLocation.set(key, flattenPosition(position, layer.color, languages))
    }
  }
  const positions = [...byLocation.values()].map((position, index) => ({ ...position, sequence_index: index }))

  const generated = regionPerLayer
    ? layers.map((layer) => layerRegion(layer, languages)).filter((r): r is DiagramRegion => r !== null)
    : []
  const carried = layers.flatMap((layer) => layer.regions.map((region) => carriedRegion(region, languages)))

  return {
    positions,
    regions: [...generated, ...carried],
    skillIds: unique(layers.flatMap((layer) => layer.skillIds)),
    conceptIds: unique(layers.flatMap((layer) => layer.conceptIds)),
  }
}
