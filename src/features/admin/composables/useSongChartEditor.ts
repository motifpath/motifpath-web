import { computed, reactive, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'

type SongChart = components['schemas']['SongChart']
type SongChartDocument = components['schemas']['SongChartDocument']
type SongChartDraftInput = components['schemas']['SongChartDraftInput']
type SongChartRevision = components['schemas']['SongChartRevision']
type TimeSignature = components['schemas']['TimeSignature']
type ImportWarning = components['schemas']['ChordProImportWarning']
type NotPublishable = components['schemas']['SongChartNotPublishableError']
type ValidationError = components['schemas']['ValidationError']

/** A draft's details, as the editor's form holds them. */
export interface SongChartDetails {
  title: string
  artist: string
  language: string
  concertKey: string | null
  capoFret: number
  tempoBpm: number | null
  timeSignature: TimeSignature | null
  rightsConfirmed: boolean
}

const EMPTY_BODY: SongChartDocument = { type: 'doc', content: [] }

function blankDetails(): SongChartDetails {
  return { title: '', artist: '', language: '', concertKey: null, capoFret: 0, tempoBpm: null, timeSignature: null, rightsConfirmed: false }
}

function detailsOf(chart: SongChart): SongChartDetails {
  const d = chart.draft
  return {
    title: d.title, artist: d.artist, language: d.language, concertKey: d.concert_key ?? null, capoFret: d.capo_fret,
    tempoBpm: d.tempo_bpm ?? null, timeSignature: d.time_signature ?? null, rightsConfirmed: d.rights_confirmation !== null,
  }
}

function hasLyricLine(body: SongChartDocument): boolean {
  return body.content.some((s) => s.content.some((line) => line.type === 'lyricLine'))
}

function isValidationError(error: unknown): error is ValidationError {
  return typeof error === 'object' && error !== null && 'errors' in error && Array.isArray(error.errors)
}

function isNotPublishable(error: unknown): error is NotPublishable {
  return typeof error === 'object' && error !== null && 'reasons' in error && Array.isArray(error.reasons)
}

/**
 * One song chart in the editor: its draft's details and lyrics as the author changes them, and
 * everything done to the chart from there. A new chart (no id) exists once it's first saved.
 * ChordPro is read by the server and only fills the editor; nothing is kept until a save.
 */
export function useSongChartEditor(songChartId: Ref<string | null>) {
  const { coreApi } = useApi()

  const chart = ref<SongChart | null>(null)
  const details = reactive<SongChartDetails>(blankDetails())
  const body = shallowRef<SongChartDocument>(EMPTY_BODY)
  const revisions = ref<SongChartRevision[]>([])
  const isLoading = ref(false)
  const loadError = ref(false)
  const notFound = ref(false)
  const isBusy = ref(false)
  const fieldErrors = ref<Record<string, string>>({})
  const importWarnings = ref<ImportWarning[]>([])
  const importError = ref<string | null>(null)
  const publishRefusal = ref<NotPublishable | null>(null)

  const snapshot = () => JSON.stringify({ details, body: body.value })
  const savedSnapshot = ref(snapshot())
  const isDirty = computed(() => snapshot() !== savedSnapshot.value)

  function show(loaded: SongChart) {
    chart.value = loaded
    Object.assign(details, detailsOf(loaded))
    body.value = loaded.draft.body
    savedSnapshot.value = snapshot()
  }

  function pathParams() {
    return { params: { path: { song_chart_id: songChartId.value ?? '' } } }
  }

  async function loadRevisions() {
    const { data } = await coreApi.GET('/song-charts/{song_chart_id}/revisions', pathParams())
    revisions.value = data ?? []
  }

  async function load() {
    if (!songChartId.value) return
    isLoading.value = true
    loadError.value = false
    notFound.value = false
    const { data, response } = await coreApi.GET('/song-charts/{song_chart_id}', pathParams())
    if (data) {
      show(data)
      await loadRevisions()
    } else {
      loadError.value = true
      notFound.value = response.status === 404
    }
    isLoading.value = false
  }

  function draftInput(): SongChartDraftInput {
    return {
      title: details.title.trim(), artist: details.artist.trim(), language: details.language,
      concert_key: details.concertKey || null, capo_fret: details.capoFret, tempo_bpm: details.tempoBpm,
      time_signature: details.timeSignature, rights_confirmed: details.rightsConfirmed, body: body.value,
    }
  }

  function missingFields(): Record<string, string> {
    const missing: Record<string, string> = {}
    if (!details.title.trim()) missing.title = 'required'
    if (!details.artist.trim()) missing.artist = 'required'
    if (!details.language) missing.language = 'required'
    if (!hasLyricLine(body.value)) missing.body = 'required'
    return missing
  }

  /** Saves the draft, creating the chart the first time. */
  async function save(): Promise<'saved' | 'invalid' | 'failed'> {
    fieldErrors.value = missingFields()
    if (Object.keys(fieldErrors.value).length > 0) return 'invalid'
    isBusy.value = true
    const result = chart.value
      ? await coreApi.PUT('/song-charts/{song_chart_id}', { ...pathParams(), body: draftInput() })
      : await coreApi.POST('/song-charts', { body: draftInput() })
    isBusy.value = false
    if (result.data) {
      show(result.data)
      return 'saved'
    }
    if (isValidationError(result.error)) {
      fieldErrors.value = Object.fromEntries(result.error.errors.map((e) => [e.field, e.reason]))
      return 'invalid'
    }
    return 'failed'
  }

  /** Fills the editor from ChordPro text: the lyrics, and the details the text sets. */
  async function readChordPro(text: string): Promise<'read' | 'invalid' | 'failed'> {
    importError.value = null
    isBusy.value = true
    const { data, error } = await coreApi.POST('/song-charts/chordpro/read', {
      body: text,
      bodySerializer: (t: string) => t,
      headers: { 'Content-Type': 'text/plain' },
    })
    isBusy.value = false
    if (!data) {
      if (isValidationError(error)) {
        importError.value = error.errors.map((e) => e.reason).join(' ')
        return 'invalid'
      }
      return 'failed'
    }
    if (data.title !== null) details.title = data.title
    if (data.artist !== null) details.artist = data.artist
    if (data.concert_key !== null) details.concertKey = data.concert_key
    if (data.capo_fret !== null) details.capoFret = data.capo_fret
    if (data.tempo_bpm !== null) details.tempoBpm = data.tempo_bpm
    if (data.time_signature !== null) details.timeSignature = data.time_signature
    body.value = data.body
    importWarnings.value = data.import_warnings
    return 'read'
  }

  /** The saved draft as ChordPro text; null when it can't be exported. */
  async function exportChordPro(): Promise<string | null> {
    const { data } = await coreApi.GET('/song-charts/{song_chart_id}/chordpro', { ...pathParams(), parseAs: 'text' })
    return data ?? null
  }

  /** Publishes the draft as the next revision, saving unsaved changes first. */
  async function publish(): Promise<'published' | 'refused' | 'invalid' | 'failed'> {
    publishRefusal.value = null
    if (isDirty.value) {
      const saved = await save()
      if (saved !== 'saved') return saved
    }
    isBusy.value = true
    const { data, error } = await coreApi.POST('/song-charts/{song_chart_id}/publish', pathParams())
    isBusy.value = false
    if (data) {
      await load()
      return 'published'
    }
    if (isNotPublishable(error)) {
      publishRefusal.value = error
      return 'refused'
    }
    return 'failed'
  }

  /** Takes a published chart away from learners, for the reason given. */
  async function withdraw(reason: string): Promise<'withdrawn' | 'failed'> {
    isBusy.value = true
    const { data } = await coreApi.POST('/song-charts/{song_chart_id}/withdraw', { ...pathParams(), body: { reason } })
    isBusy.value = false
    if (!data) return 'failed'
    show(data)
    return 'withdrawn'
  }

  watch(songChartId, (id, previous) => {
    if (id && id !== chart.value?.song_chart_id && id !== previous) void load()
  })
  void load()

  return {
    chart, details, body, revisions, isDirty, isLoading, isBusy, loadError, notFound, fieldErrors,
    importWarnings, importError, publishRefusal, load, save, readChordPro, exportChordPro, publish, withdraw,
  }
}
