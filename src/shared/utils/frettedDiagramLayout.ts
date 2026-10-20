import type { components } from '@/api/generated/core-domain'
import { resolveMarkerColor } from '@/shared/utils/diagramColors'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type DiagramRef = components['schemas']['DiagramRef']
type DiagramPosition = components['schemas']['DiagramPosition']
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
  /** Positions this usage doesn't draw (`layers.hidden_position_ids` or filtered out by
   *  `layers.subset`) — an author's preview can still show them faded. */
  hiddenPositions: VisibleFrettedPosition[]
  /** Highlighted bands, in drawing order (later ones on top). */
  regions: FrettedRegion[]
  stringCount: number
  /** The fret wire before the lowest drawn position, region or extra fret (or, with
   *  `includeHidden`, the lowest of every position), but never below the nut (0): open-string
   *  markers sit on the nut, so nothing is drawn left of it. */
  minFret: number
  /** The highest such fret, so no empty fret space follows it — widened upward to the minimum span. */
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
  options: { includeHidden?: boolean; extraFrets?: number[] } = {},
): FrettedDiagramLayout {
  const subset = diagramRef.layers.subset
  const hidden = diagramRef.layers.hidden_position_ids ?? []
  const isDrawn = (position: DiagramPosition) =>
    (!subset || subset.includes(position.interval)) && !hidden.includes(position.position_id ?? '')
  const allPositions: VisibleFrettedPosition[] = diagram.positions.map((position) => ({
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
  const positions = allPositions.filter((_, i) => isDrawn(diagram.positions[i]!))
  const hiddenPositions = allPositions.filter((_, i) => !isDrawn(diagram.positions[i]!))
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

  const { minFret, maxFret } = shownFretWindow([
    ...(options.includeHidden ? allPositions : positions).map((position) => position.fret),
    ...regions.flatMap((region) => [region.fretStart, region.fretEnd]),
    ...(options.extraFrets ?? []),
  ])

  return { positions, hiddenPositions, regions, stringCount, minFret, maxFret }
}

/** The frets every position and region of a diagram uses, hidden ones included. */
export function allUsedFrets(diagram: Diagram): number[] {
  return [
    ...diagram.positions.map((position) => position.fret ?? 0),
    ...(diagram.regions ?? []).flatMap((region) => [region.fret_start ?? 0, region.fret_end ?? 0]),
  ]
}

/** The fret spaces a board shows for the given used frets: from the wire before the lowest to the
 *  highest, never below the nut, and at least the minimum span. */
function shownFretWindow(frets: number[]): { minFret: number; maxFret: number } {
  const minFret = frets.length > 0 ? Math.max(Math.min(...frets) - 1, 0) : 0
  const highFret = frets.length > 0 ? Math.max(...frets) : 0
  return { minFret, maxFret: minFret + Math.max(highFret - minFret, MIN_FRET_SPAN) }
}

/**
 * The window a diagram's answer cells cover: one spare fret space beyond the used frets on each
 * side (never below the nut), at least the minimum span. The server derives an exercise's cell
 * options over exactly this window, so an unsaved preview must use it too — even though the
 * board shows no spare space of its own, the cells widen it.
 */
export function answerCellFretWindow(frets: number[]): { minFret: number; maxFret: number } {
  const minFret = frets.length > 0 ? Math.max(Math.min(...frets) - 1, 0) : 0
  const highFret = frets.length > 0 ? Math.max(...frets) + 1 : MIN_FRET_SPAN
  return { minFret, maxFret: minFret + Math.max(highFret - minFret, MIN_FRET_SPAN) }
}
