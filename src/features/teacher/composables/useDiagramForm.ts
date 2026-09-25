import { computed, ref } from 'vue'

import { i18n, OFFERED_LANGUAGE_CODES, toApiLanguageCode } from '@/i18n'
import { intervalFromRoot, noteAtFret } from '@/shared/utils/musicTheory'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type CreateDiagramRequest = components['schemas']['CreateDiagramRequest']
type UpdateDiagramRequest = components['schemas']['UpdateDiagramRequest']
type DiagramPosition = components['schemas']['DiagramPosition']
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
}

function makeId(): string {
  return crypto.randomUUID()
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
function toDiagramPosition(position: IntervalledPosition, { withId = true } = {}): DiagramPosition {
  return {
    ...(withId ? { position_id: position.id } : {}),
    interval: position.interval,
    note_name: position.noteName,
    shape: position.shape,
    ...(position.color ? { color: position.color } : {}),
    sequence_index: position.sequenceIndex,
    string: position.string,
    fret: position.fret,
  }
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
  // The languages the author chose for the diagram (ADR-034, 2026-09-25 amendment); a new one
  // starts in the author's UI language. Only these languages' names are ever sent.
  const languages = ref<string[]>([toApiLanguageCode(i18n.global.locale.value)])
  const instrumentId = ref('')
  const positions = ref<LocalPosition[]>([])
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
    names.value = Object.fromEntries(Object.entries(names.value).filter(([language]) => language !== code))
  }
  const hasPositions = computed(() => positions.value.length > 0)
  const hasClassification = computed(() => skillIds.value.length > 0 && conceptIds.value.length > 0)
  // The server rejects any position with an empty interval or note_name --
  // checked here too so a save attempt never round-trips just to learn that.
  const hasCompletePositions = computed(() =>
    positions.value.every((p) => p.interval.trim() !== '' && p.noteName.trim() !== ''),
  )
  const canSave = computed(
    () => hasName.value && hasPositions.value && hasCompletePositions.value && hasClassification.value,
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
    positions.value.push({ id: makeId(), ...cell, ...computeNotes(cell), shape: 'dot', color: null, sequenceIndex: null })
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
      positions: positions.value.filter(hasInterval).map((position) => toDiagramPosition(position)),
      classification: { skill_ids: [...skillIds.value], concept_ids: [...conceptIds.value] },
    }
  }

  /**
   * A new diagram of `kind`, named `copyName`, copying everything the form
   * currently shows — how "Save as" creates a copy while leaving the source
   * untouched. Position ids are left out for the server to assign: a
   * position id is unique across every diagram, so the source's ids can't be
   * reused.
   */
  function toCopyRequest(copyNames: LocalizedNames, kind: DiagramKind): CreateDiagramRequest {
    return {
      ...toCreateDiagramRequest(),
      names: filledNames(copyNames, Object.keys(copyNames)),
      kind,
      positions: positions.value.filter(hasInterval).map((position) => toDiagramPosition(position, { withId: false })),
    }
  }

  function toUpdateDiagramRequest(): UpdateDiagramRequest {
    return {
      names: filledNames(names.value, languages.value),
      ...(rootNote.value.trim() === '' ? {} : { root_note: rootNote.value }),
      label_display: labelDisplay.value,
      // An already-set general color can't be cleared through an update, so an unset one is omitted.
      ...(color.value ? { color: color.value } : {}),
      positions: positions.value.filter(hasInterval).map((position) => toDiagramPosition(position)),
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
      .map((p) => ({
        id: p.position_id ?? makeId(),
        string: p.string ?? 0,
        fret: p.fret ?? 0,
        interval: p.interval,
        noteName: p.note_name,
        shape: p.shape ?? 'dot',
        color: p.color ?? null,
        sequenceIndex: p.sequence_index ?? null,
      }))
    reindexSequence()
    skillIds.value = diagram.classification.skills.map((s) => s.skill_id)
    conceptIds.value = diagram.classification.concepts.map((c) => c.concept_id)
  }

  return {
    names,
    languages,
    missingNameLanguages,
    hasEveryName,
    setName,
    addLanguage,
    removeLanguage,
    instrumentId,
    positions,
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
    toggleCell,
    reorderPositions,
    recomputeFromRoot,
    toCreateDiagramRequest,
    toCopyRequest,
    toUpdateDiagramRequest,
    loadFromDiagram,
    markSaved,
  }
}
