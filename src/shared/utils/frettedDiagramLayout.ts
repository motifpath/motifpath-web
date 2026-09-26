import type { components } from '@/api/generated/core-domain'
import { resolveMarkerColor } from '@/shared/utils/diagramColors'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']
type LocalizedText = components['schemas']['LocalizedNote']

/** One `Diagram` position, resolved for a fretted-family renderer. */
export interface VisibleFrettedPosition {
  positionId: string
  string: number
  fret: number
  interval: string
  noteName: string
  shape: components['schemas']['DiagramPosition']['shape']
  isRoot: boolean
  /** The persisted marker color (own, else the diagram's general color); null = renderer default. */
  color: string | null
  /** Shown inside the marker instead of the interval/note name; null = none. */
  customLabel: LocalizedText | null
  /** Explains the marker to a reader; null = none. */
  note: LocalizedText | null
}

/** One `Diagram` region, resolved for a fretted-family renderer: string bounds always set. */
export interface FrettedRegion {
  regionId: string
  fretStart: number
  fretEnd: number
  stringStart: number
  stringEnd: number
  description: LocalizedText
  /** The band's #RRGGBB tint; null = renderer default. */
  color: string | null
}

export interface FrettedDiagramLayout {
  positions: VisibleFrettedPosition[]
  /** Highlighted bands, in drawing order (later ones on top). */
  regions: FrettedRegion[]
  stringCount: number
  /** One fret below the lowest visible position or region (or the diagram's nut, whichever wins the minimum span). */
  minFret: number
  /** One fret above the highest visible position or region (or the diagram's nut, whichever wins the minimum span). */
  maxFret: number
}

const MIN_FRET_SPAN = 3

/**
 * Resolves a fretted `Diagram`'s positions against a `DiagramRef`'s
 * `layers` config into renderer-ready data: which positions are visible
 * (per `layers.subset`) and the fret window they occupy. Root transposition
 * (`root_override`) and playback are not applied here — this is the base
 * layer every other one decorates, per ADR-028.
 *
 * Assumes `diagram` is authored against a `fretted`-family `instrument` —
 * every position carries `string`/`fret`, never `key`.
 */
export function computeFrettedDiagramLayout(
  diagram: Diagram,
  instrument: Instrument,
  diagramRef: DiagramRef,
): FrettedDiagramLayout {
  const subset = diagramRef.layers.subset
  const positions: VisibleFrettedPosition[] = diagram.positions
    .filter((position) => !subset || subset.includes(position.interval))
    .map((position) => ({
      positionId: position.position_id ?? '',
      string: position.string ?? 0,
      fret: position.fret ?? 0,
      interval: position.interval,
      noteName: position.note_name,
      shape: position.shape,
      isRoot: position.interval === 'R',
      color: resolveMarkerColor(position.color, diagram.color),
      customLabel: position.custom_label ?? null,
      note: position.note ?? null,
    }))
  const stringCount = instrument.string_count ?? 0
  // A diagram served by an older API has no regions field at all.
  const regions: FrettedRegion[] = (diagram.regions ?? []).map((region) => ({
    regionId: region.region_id ?? '',
    fretStart: region.fret_start ?? 0,
    fretEnd: region.fret_end ?? 0,
    stringStart: region.string_start ?? 1,
    stringEnd: region.string_end ?? stringCount,
    description: region.description,
    color: region.color ?? null,
  }))

  const frets = [
    ...positions.map((position) => position.fret),
    ...regions.flatMap((region) => [region.fretStart, region.fretEnd]),
  ]
  const lowFret = frets.length > 0 ? Math.min(...frets) - 1 : 0
  const highFret = frets.length > 0 ? Math.max(...frets) + 1 : MIN_FRET_SPAN
  const span = Math.max(highFret - lowFret, MIN_FRET_SPAN)

  return {
    positions,
    regions,
    stringCount,
    minFret: lowFret,
    maxFret: lowFret + span,
  }
}
