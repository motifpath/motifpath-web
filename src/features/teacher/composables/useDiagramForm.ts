import { computed, ref } from 'vue'

import { i18n, OFFERED_LANGUAGE_CODES, toApiLanguageCode } from '@/i18n'
import { intervalFromRoot, noteAtFret } from '@/shared/utils/musicTheory'
import type { FlattenedStack } from '@/shared/utils/flattenDiagramStack'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']
type UpdateDiagramRequest = components['schemas']['UpdateDiagramRequest']
type DiagramPosition = components['schemas']['DiagramPosition']
type DiagramRegion = components['schemas']['DiagramRegion']
type DiagramKind = Diagram['kind']
type LocalizedNames = components['schemas']['LocalizedNames']
type IntervalCode = DiagramPosition['interval']

export interface FrettedCell {
  string: number
  fret: number
}

export type PositionShape = DiagramPosition['shape']
export type LabelDisplay = Diagram['label_display']

export interface LocalPosition extends FrettedCell {
  id: string
  /** Empty until a root note is chosen, since the interval is computed from it. */
  interval: IntervalCode | ''
  noteName: string
  shape: PositionShape
  /** This marker's own #RRGGBB color; null = use the diagram's general color. */
  color: string | null
  sequenceIndex: number | null
  /** Shown inside the marker instead of its interval/note name, per language code. */
  customLabel: LocalizedNames
  /** Explains the marker to a reader, per language code. */
  note: LocalizedNames
}

/** A highlighted band of frets, optionally limited to some strings, captioned per language. */
/** One piece of text a language still lacks; `region` and `position` count from 1, in list order. */
export type MissingText =
  | { kind: 'name' }
  | { kind: 'regionCaption'; region: number }
  | { kind: 'regionCaptionTooLong'; region: number }
  | { kind: 'markerLabel'; position: number }
  | { kind: 'markerNote'; position: number }

export interface LocalRegion {
  id: string
  fretStart: number
  fretEnd: number
  /** Both null means the band covers every string. */
  stringStart: number | null
  stringEnd: number | null
  description: LocalizedNames
  /** The band's #RRGGBB tint; null = the default tint. */
  color: string | null
}

function makeId(): string {
  return crypto.randomUUID()
}

/** The longest region caption the server accepts, in characters. */
export const REGION_CAPTION_MAX_LENGTH = 60

/** A served or merged position as the editor holds it; one without an id gets a new one. */
function toLocalPosition(p: DiagramPosition): LocalPosition {
  return {
    id: p.position_id ?? makeId(),
    string: p.string ?? 0,
    fret: p.fret ?? 0,
    interval: p.interval,
    noteName: p.note_name,
    shape: p.shape ?? 'dot',
    color: p.color ?? null,
    sequenceIndex: p.sequence_index ?? null,
    customLabel: { ...(p.custom_label ?? {}) },
    note: { ...(p.note ?? {}) },
  }
}

/** A served or merged region as the editor holds it; one without an id gets a new one. */
function toLocalRegion(r: DiagramRegion): LocalRegion {
  return {
    id: r.region_id ?? makeId(),
    fretStart: r.fret_start ?? 0,
    fretEnd: r.fret_end ?? 0,
    stringStart: r.string_start ?? null,
    stringEnd: r.string_end ?? null,
    description: { ...r.description },
    color: r.color ?? null,
  }
}

function sameCell(position: FrettedCell, cell: FrettedCell): boolean {
  return position.string === cell.string && position.fret === cell.fret
}

type IntervalledPosition = LocalPosition & { interval: IntervalCode }

/** Whether a position has its interval yet — it can't be sent without one. */
function hasInterval(position: LocalPosition): position is IntervalledPosition {
  return position.interval !== ''
}

/** `withId: false` leaves position_id for the server to assign. */
function toDiagramPosition(
  position: IntervalledPosition,
  languages: string[],
  { withId = true } = {},
): DiagramPosition {
  const customLabel = filledNames(position.customLabel, languages)
  const note = filledNames(position.note, languages)
  return {
    ...(withId ? { position_id: position.id } : {}),
    interval: position.interval,
    note_name: position.noteName,
    shape: position.shape,
    ...(position.color ? { color: position.color } : {}),
    sequence_index: position.sequenceIndex,
    string: position.string,
    fret: position.fret,
    ...(Object.keys(customLabel).length > 0 ? { custom_label: customLabel } : {}),
    ...(Object.keys(note).length > 0 ? { note } : {}),
  }
}

/** `withId: false` leaves region_id for the server to assign. */
function toDiagramRegion(region: LocalRegion, languages: string[], { withId = true } = {}): DiagramRegion {
  return {
    ...(withId ? { region_id: region.id } : {}),
    fret_start: region.fretStart,
    fret_end: region.fretEnd,
    ...(region.stringStart !== null && region.stringEnd !== null
      ? { string_start: region.stringStart, string_end: region.stringEnd }
      : {}),
    description: filledNames(region.description, languages),
    color: region.color,
  }
}

/** Whether any language of `text` is filled in. */
function hasAnyText(text: LocalizedNames): boolean {
  return Object.values(text).some((value) => value.trim() !== '')
}

/** `text` without `code`. */
function withoutLanguage(text: LocalizedNames, code: string): LocalizedNames {
  return Object.fromEntries(Object.entries(text).filter(([language]) => language !== code))
}

/**
 * Holds all authoring state for one fretted `Diagram` and maps it to the
 * Create/UpdateDiagramRequest shapes the API expects. Positions are
 * addressed by a client-generated id from the moment they're placed (before
 * any save round trip), matching the API's own allowance for a
 * client-supplied position_id.
 */
/** The names in `languages` that are filled in, trimmed; blank ones are left out. */
function filledNames(names: LocalizedNames, languages: string[]): LocalizedNames {
  return Object.fromEntries(
    languages
      .map((code) => [code, (names[code] ?? '').trim()] as const)
      .filter(([, value]) => value !== ''),
  )
}

/** `codes` in the order the UI offers its languages, any code it doesn't offer last. */
function inOfferedOrder(codes: string[]): string[] {
  const rank = (code: string) => {
    const index = OFFERED_LANGUAGE_CODES.indexOf(code)
    return index === -1 ? OFFERED_LANGUAGE_CODES.length : index
  }
  return [...new Set(codes)].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export function useDiagramForm() {
  // The diagram's name per language code; a language with no name is absent or blank.
  const names = ref<LocalizedNames>({})
  // The languages the author chose for the diagram; a new one
  // starts in the author's UI language. Only these languages' names are ever sent.
  const languages = ref<string[]>([toApiLanguageCode(i18n.global.locale.value)])
  const instrumentId = ref('')
  const positions = ref<LocalPosition[]>([])
  const regions = ref<LocalRegion[]>([])
  const skillIds = ref<string[]>([])
  const conceptIds = ref<string[]>([])
  // Open-string note per string, lowest string first (Instrument.tuning) — and the
  // teacher-chosen root note. Both are authoring aids only: neither is persisted, they just
  // drive the interval/note_name auto-fill below.
  const tuning = ref<string[]>([])
  const rootNote = ref('')
  // Persisted with the diagram (Diagram.label_display); defaults to 'interval' like the API does.
  const labelDisplay = ref<LabelDisplay>('interval')
  // Persisted with the diagram (Diagram.color): the general marker color as #RRGGBB, null = unrecorded.
  const color = ref<string | null>(null)
  // The general color the server last returned. An update cannot unset an already-saved color, so
  // clearing is only offered while none is saved.
  const savedColor = ref<string | null>(null)
  const canClearColor = computed(() => savedColor.value === null)

  const missingNameLanguages = computed(() =>
    languages.value.filter((code) => (names.value[code] ?? '').trim() === ''),
  )
  // Every piece of text a diagram carries must be written in every one of its languages: the
  // name, each region's caption, and any custom label or note started in some language.
  const annotationTexts = computed<LocalizedNames[]>(() => [
    ...regions.value.map((region) => region.description),
    ...positions.value.flatMap((position) => [position.customLabel, position.note].filter(hasAnyText)),
  ])

  /** Whether every label, note and region caption is written in each of `codes` — what a copy
   *  named in those languages needs, since text can't be invented for a language it lacks. */
  function hasTextIn(codes: readonly string[]): boolean {
    return annotationTexts.value.every((text) => codes.every((code) => (text[code] ?? '').trim() !== ''))
  }
  // What each of the diagram's languages still lacks, so the author can be told exactly what to fill in.
  const missingText = computed<Record<string, MissingText[]>>(() => {
    const lacks = (text: LocalizedNames, code: string) => (text[code] ?? '').trim() === ''
    return Object.fromEntries(
      languages.value.map((code) => {
        const missing: MissingText[] = []
        if (lacks(names.value, code)) missing.push({ kind: 'name' })
        regions.value.forEach((region, index) => {
          if (lacks(region.description, code)) missing.push({ kind: 'regionCaption', region: index + 1 })
          else if ((region.description[code] ?? '').trim().length > REGION_CAPTION_MAX_LENGTH) {
            missing.push({ kind: 'regionCaptionTooLong', region: index + 1 })
          }
        })
        positions.value.forEach((position, index) => {
          if (hasAnyText(position.customLabel) && lacks(position.customLabel, code)) {
            missing.push({ kind: 'markerLabel', position: index + 1 })
          }
          if (hasAnyText(position.note) && lacks(position.note, code)) {
            missing.push({ kind: 'markerNote', position: index + 1 })
          }
        })
        return [code, missing]
      }),
    )
  })
  const missingTextLanguages = computed(() =>
    languages.value.filter((code) => (missingText.value[code] ?? []).length > 0),
  )
  const hasCompleteText = computed(() => languages.value.length > 0 && missingTextLanguages.value.length === 0)
  const hasName = computed(() => languages.value.length > 0 && missingNameLanguages.value.length === 0)
  // A basic diagram is shared with every teacher, so it needs a name in every offered language.
  const hasEveryName = computed(
    () => hasName.value && OFFERED_LANGUAGE_CODES.every((code) => languages.value.includes(code)),
  )

  function setName(code: string, value: string) {
    names.value = { ...names.value, [code]: value }
  }

  function addLanguage(code: string) {
    languages.value = inOfferedOrder([...languages.value, code])
  }

  /** Drops a language and its name; a diagram always keeps at least one language. */
  function removeLanguage(code: string) {
    if (languages.value.length <= 1 || !languages.value.includes(code)) return
    languages.value = languages.value.filter((language) => language !== code)
    names.value = withoutLanguage(names.value, code)
    positions.value.forEach((position) => {
      position.customLabel = withoutLanguage(position.customLabel, code)
      position.note = withoutLanguage(position.note, code)
    })
    regions.value.forEach((region) => (region.description = withoutLanguage(region.description, code)))
  }
  const hasPositions = computed(() => positions.value.length > 0)
  const hasClassification = computed(() => skillIds.value.length > 0 && conceptIds.value.length > 0)
  // The server rejects any position with an empty interval or note_name --
  // checked here too so a save attempt never round-trips just to learn that.
  const hasCompletePositions = computed(() =>
    positions.value.every((p) => p.interval.trim() !== '' && p.noteName.trim() !== ''),
  )
  // A band must not run backwards, and a string range needs both ends, on strings the instrument has.
  const invalidRegionIds = computed(() =>
    regions.value
      .filter((region) => {
        if (region.fretStart < 0 || region.fretStart > region.fretEnd) return true
        if (region.stringStart === null && region.stringEnd === null) return false
        if (region.stringStart === null || region.stringEnd === null) return true
        const stringCount = tuning.value.length
        return (
          region.stringStart < 1 ||
          region.stringStart > region.stringEnd ||
          (stringCount > 0 && region.stringEnd > stringCount)
        )
      })
      .map((region) => region.id),
  )
  const canSave = computed(
    () =>
      hasName.value &&
      hasCompleteText.value &&
      invalidRegionIds.value.length === 0 &&
      hasPositions.value &&
      hasCompletePositions.value &&
      hasClassification.value,
  )

  // tuning is lowest-string-first; DiagramPosition.string counts from the highest-pitched
  // string (1), so the open note for a given string lives at the mirrored index.
  function openStringNote(stringNumber: number): string | undefined {
    return tuning.value.length > 0 ? tuning.value[tuning.value.length - stringNumber] : undefined
  }

  function computeNotes(cell: FrettedCell): { interval: IntervalCode | ''; noteName: string } {
    const openNote = openStringNote(cell.string)
    if (!openNote || rootNote.value.trim() === '') return { interval: '', noteName: '' }
    const noteName = noteAtFret(openNote, cell.fret)
    return { interval: intervalFromRoot(noteName, rootNote.value), noteName }
  }

  function reindexSequence() {
    positions.value.forEach((position, index) => (position.sequenceIndex = index))
  }

  function addPosition(cell: FrettedCell) {
    if (positions.value.some((p) => sameCell(p, cell))) return
    positions.value.push({
      id: makeId(),
      ...cell,
      ...computeNotes(cell),
      shape: 'dot',
      color: null,
      sequenceIndex: null,
      customLabel: {},
      note: {},
    })
    reindexSequence()
  }

  function setPositionShape(id: string, shape: PositionShape) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.shape = shape
  }

  function setPositionColor(id: string, positionColor: string | null) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.color = positionColor
  }

  function setPositionCustomLabel(id: string, code: string, value: string) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.customLabel = { ...position.customLabel, [code]: value }
  }

  function setPositionNote(id: string, code: string, value: string) {
    const position = positions.value.find((p) => p.id === id)
    if (position) position.note = { ...position.note, [code]: value }
  }

  /** A new region over the placed positions' frets, or the first frets while there are none. */
  function addRegion() {
    const frets = positions.value.map((p) => p.fret)
    regions.value.push({
      id: makeId(),
      fretStart: frets.length > 0 ? Math.min(...frets) : 0,
      fretEnd: frets.length > 0 ? Math.max(...frets) : 3,
      stringStart: null,
      stringEnd: null,
      description: {},
      color: null,
    })
  }

  function findRegion(id: string): LocalRegion | undefined {
    return regions.value.find((r) => r.id === id)
  }

  function setRegionFrets(id: string, fretStart: number, fretEnd: number) {
    const region = findRegion(id)
    if (region) Object.assign(region, { fretStart, fretEnd })
  }

  /** Both null lets the band cover every string. */
  function setRegionStrings(id: string, stringStart: number | null, stringEnd: number | null) {
    const region = findRegion(id)
    if (region) Object.assign(region, { stringStart, stringEnd })
  }

  function setRegionDescription(id: string, code: string, value: string) {
    const region = findRegion(id)
    if (region) region.description = { ...region.description, [code]: value }
  }

  function setRegionColor(id: string, regionColor: string | null) {
    const region = findRegion(id)
    if (region) region.color = regionColor
  }

  function removeRegion(id: string) {
    regions.value = regions.value.filter((r) => r.id !== id)
  }

  function removePosition(id: string) {
    positions.value = positions.value.filter((p) => p.id !== id)
    reindexSequence()
  }

  function reorderPositions(fromIndex: number, toIndex: number) {
    const reordered = [...positions.value]
    const [moved] = reordered.splice(fromIndex, 1)
    if (!moved) return
    reordered.splice(toIndex, 0, moved)
    positions.value = reordered
    reindexSequence()
  }

  function recomputeFromRoot() {
    positions.value.forEach((position) => Object.assign(position, computeNotes(position)))
  }

  function toggleCell(cell: FrettedCell) {
    const existing = positions.value.find((p) => sameCell(p, cell))
    if (existing) removePosition(existing.id)
    else addPosition(cell)
  }

  /** A new custom diagram from the form; the caller becomes its creator. */
  function toCreateDiagramRequest(): CreateDiagramRequest {
    return {
      instrument_id: instrumentId.value,
      names: filledNames(names.value, languages.value),
      kind: 'custom',
      root_note: rootNote.value.trim() === '' ? null : rootNote.value,
      label_display: labelDisplay.value,
      color: color.value,
      positions: positions.value.filter(hasInterval).map((position) => toDiagramPosition(position, languages.value)),
      regions: regions.value.map((region) => toDiagramRegion(region, languages.value)),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  /**
   * A new diagram of `kind`, named `copyName`, copying everything the form
   * currently shows — how "Save as" creates a copy while leaving the source
   * untouched. Position and region ids are left out for the server to
   * assign: each is unique across every diagram, so the source's ids can't
   * be reused.
   */
  function toCopyRequest(copyNames: LocalizedNames, kind: DiagramKind): CreateDiagramRequest {
    return {
      ...toCreateDiagramRequest(),
      names: filledNames(copyNames, Object.keys(copyNames)),
      kind,
      positions: positions.value
        .filter(hasInterval)
        .map((position) => toDiagramPosition(position, languages.value, { withId: false })),
      regions: regions.value.map((region) => toDiagramRegion(region, languages.value, { withId: false })),
    }
  }

  function toUpdateDiagramRequest(): UpdateDiagramRequest {
    return {
      names: filledNames(names.value, languages.value),
      ...(rootNote.value.trim() === '' ? {} : { root_note: rootNote.value }),
      label_display: labelDisplay.value,
      // An already-set general color can't be cleared through an update, so an unset one is omitted.
      ...(color.value ? { color: color.value } : {}),
      positions: positions.value.filter(hasInterval).map((position) => toDiagramPosition(position, languages.value)),
      // The full list, so an empty one removes every saved region.
      regions: regions.value.map((region) => toDiagramRegion(region, languages.value)),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  /** Records the server's copy of a just-saved diagram, so later saves are updates against it. */
  function markSaved(diagram: Diagram) {
    savedColor.value = diagram.color ?? null
  }

  function loadFromDiagram(diagram: Diagram) {
    names.value = { ...diagram.names }
    languages.value = inOfferedOrder(diagram.languages?.length ? diagram.languages : Object.keys(diagram.names))
    instrumentId.value = diagram.instrument_id
    rootNote.value = diagram.root_note ?? ''
    labelDisplay.value = diagram.label_display ?? 'interval'
    color.value = diagram.color ?? null
    savedColor.value = diagram.color ?? null
    positions.value = [...diagram.positions]
      .sort((a, b) => (a.sequence_index ?? 0) - (b.sequence_index ?? 0))
      .map(toLocalPosition)
    reindexSequence()
    // A diagram served by an older API has no regions field at all.
    regions.value = (diagram.regions ?? []).map(toLocalRegion)
    skillIds.value = diagram.classification.skills.map((s) => s.skill_id)
    conceptIds.value = diagram.classification.concepts.map((c) => c.concept_id)
  }

  /**
   * Takes over the result of merging a stack of diagrams: its positions, regions and
   * classification replace the form's own, each with a new id. The diagram-level fields
   * (names, languages, instrument, root note, label display, color) stay as they are, and
   * the positions keep the intervals they were merged with rather than being recomputed.
   */
  function loadFlattened(flattened: FlattenedStack) {
    positions.value = flattened.positions.map((p) => toLocalPosition({ ...p, position_id: undefined }))
    reindexSequence()
    regions.value = flattened.regions.map((r) => toLocalRegion({ ...r, region_id: undefined }))
    skillIds.value = [...flattened.skillIds]
    conceptIds.value = [...flattened.conceptIds]
  }

  return {
    names,
    languages,
    missingNameLanguages,
    missingText,
    missingTextLanguages,
    hasCompleteText,
    hasTextIn,
    hasEveryName,
    setName,
    addLanguage,
    removeLanguage,
    instrumentId,
    positions,
    regions,
    invalidRegionIds,
    skillIds,
    conceptIds,
    tuning,
    rootNote,
    labelDisplay,
    color,
    canClearColor,
    hasName,
    hasPositions,
    hasCompletePositions,
    hasClassification,
    canSave,
    addPosition,
    removePosition,
    setPositionShape,
    setPositionColor,
    setPositionCustomLabel,
    setPositionNote,
    addRegion,
    setRegionFrets,
    setRegionStrings,
    setRegionDescription,
    setRegionColor,
    removeRegion,
    toggleCell,
    reorderPositions,
    recomputeFromRoot,
    toCreateDiagramRequest,
    toCopyRequest,
    toUpdateDiagramRequest,
    loadFromDiagram,
    loadFlattened,
    markSaved,
  }
}
