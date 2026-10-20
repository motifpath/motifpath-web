import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { GeneratedChoiceGrading } from '@/features/student/composables/usePracticeSessionRun'
import type { DrillChord, DrillQuestionOption, DrillQuestionView } from '@/shared/components/DrillQuestion.vue'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { fetchInstruments } from '@/shared/composables/useListInstruments'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { GeneratedQuestion, ProgressionCatalog } from '@/shared/utils/generatedChoice'
import { musicKeyMessage, numeralLabel } from '@/shared/utils/musicKey'

type Item = components['schemas']['PracticeSessionItem']
type Question = components['schemas']['GeneratedChoiceQuestion']
type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type Playback = components['schemas']['GeneratedChoicePlayback']

export type GeneratedQuestionStatus = 'loading' | 'ready' | 'unavailable'

/** A box loaded for a chord: the voicing's diagram, which carries its fingering. */
interface LoadedBox {
  diagram: Diagram
}

/** The kinds whose question is a progression, graded against the progression catalog. */
const PROGRESSION_KINDS: Item['kind'][] = ['chart_progression', 'heard_progression']

/** A chord symbol's root, as the bass plays it: the symbol without its m or dim. */
function rootOf(symbol: string): string {
  return /^[A-G][#b]?/.exec(symbol)?.[0] ?? symbol
}

/**
 * A generated harmony question of a session, as the screen asks it: the prompt, what it shows or
 * plays, and its options, drawn as the plan reads chords (boxes on guitar, symbols on bass). On a
 * guitar reading it loads every box the plan names, and the instrument they are drawn on; a
 * question asked by ear loads the voicing of every chord it plays, the instrument they sound on
 * and, on bass, the bass its roots play on; a progression question loads the progression catalog
 * it is graded against. It is unavailable when any of that can't be loaded, so it can be skipped
 * and never counted wrong.
 */
export function useGeneratedQuestion(item: MaybeRefOrGetter<Item>) {
  const { coreApi } = useApi()
  const { t } = useTypedT()
  const { load: loadCatalog } = useProgressionCatalog()

  const question = computed<Question>(() => toValue(item).generated_choice!)
  const playback = computed<Playback | null>(() => question.value.playback ?? null)
  /** Whether a box is drawn: on a guitar reading, for a question that shows chords rather than plays them. */
  const boxesNeeded = computed(() => question.value.drawn_as === 'chord_boxes' && !playback.value)
  const isProgression = computed(() => PROGRESSION_KINDS.includes(toValue(item).kind))

  const status = ref<GeneratedQuestionStatus>('loading')
  const boxes = ref<Record<string, LoadedBox>>({})
  const instrument = ref<Instrument | null>(null)
  const bassInstrument = ref<Instrument | null>(null)
  const catalog = ref<ProgressionCatalog>({})

  /** Every chord the question draws: what it gives, its chart, and its chord or chart options. */
  function chordsDrawn(planned: Question): string[] {
    const chordOptions = planned.way === 'numeral_to_chord' || planned.way === 'function_to_chord'
    return [
      ...(planned.chord ? [planned.chord] : []),
      ...planned.chart,
      ...planned.options.flatMap((option) => (chordOptions ? [option.value] : option.chart)),
    ]
  }

  /** Every chord whose voicing must be loaded: the ones a guitar reading draws, or the ones a question plays. */
  function chordsNeeded(planned: Question): string[] {
    if (planned.playback) return planned.playback.bars.map((bar) => bar.chord)
    return planned.drawn_as === 'chord_boxes' ? chordsDrawn(planned) : []
  }

  /** Loads the voicings, and the instruments they and the bass line sound on; false when any is missing. */
  async function loadVoicings(planned: Question): Promise<boolean> {
    const needed = chordsNeeded(planned)
    if (needed.length === 0) return true
    const loaded = await Promise.all(planned.voicings.map(async (box) => [box.chord, await fetchDiagram(coreApi, box.diagram_id)] as const))
    const found: Record<string, LoadedBox> = {}
    for (const [chord, diagram] of loaded) {
      if (!diagram?.chord_voicing) return false
      found[chord] = { diagram }
    }
    if (needed.some((chord) => !found[chord])) return false
    const { data } = await fetchInstruments(coreApi)
    const listed = (id: string | null | undefined) => data?.find((candidate) => candidate.instrument_id === id) ?? null
    const onInstrument = listed(loaded[0]?.[1]?.instrument_id)
    const bassId = planned.playback?.bass_line ? planned.playback.bass_instrument_id : null
    const onBass = bassId ? listed(bassId) : null
    if (!onInstrument || (bassId && !onBass)) return false
    boxes.value = found
    instrument.value = onInstrument
    bassInstrument.value = onBass
    return true
  }

  watch(
    () => toValue(item).item_key + (toValue(item).generated_choice?.way ?? ''),
    async () => {
      const planned = question.value
      const needsCatalog = isProgression.value
      status.value = chordsNeeded(planned).length > 0 || needsCatalog ? 'loading' : 'ready'
      if (status.value === 'ready') return
      const [voicingsLoaded, loadedCatalog] = await Promise.all([loadVoicings(planned), needsCatalog ? loadCatalog() : Promise.resolve({})])
      if (planned !== question.value) return
      if (loadedCatalog) catalog.value = loadedCatalog
      status.value = voicingsLoaded && loadedCatalog ? 'ready' : 'unavailable'
    },
    { immediate: true },
  )

  const keyName = computed(() => t(musicKeyMessage(question.value.music_key)))

  /** A chord as the question draws it: a box on a guitar reading, a symbol otherwise. */
  function chordOf(symbol: string): DrillChord {
    const box = boxesNeeded.value ? boxes.value[symbol] : undefined
    return box?.diagram.chord_voicing ? { symbol, voicing: box.diagram.chord_voicing, diagram: box.diagram } : { symbol }
  }

  const prompt = computed(() => {
    const q = question.value
    const key = keyName.value
    switch (q.way) {
      case 'numeral_to_chord':
        return t('sessionGeneratedChoice.numeralToChord', { key, numeral: numeralLabel(q.numeral ?? '') })
      case 'chord_to_numeral':
      case 'see_then_name':
        return t('sessionGeneratedChoice.chordToNumeral', { key })
      case 'chord_to_function':
        return t('sessionGeneratedChoice.chordToFunction', { key, chord: q.chord ?? '' })
      case 'function_to_chord':
        return t('sessionGeneratedChoice.functionToChord', { key, function: t(`sessionGeneratedChoice.functions.${q.function ?? 'tonic'}`) })
      case 'chart_to_numbers':
        return t('sessionGeneratedChoice.chartToNumbers')
      case 'numbers_to_chart':
        return t('sessionGeneratedChoice.numbersToChart', { progression: q.progression?.name ?? '' })
      case 'cadence_then_chord':
        return t('sessionGeneratedChoice.cadenceThenChord')
      case 'progression_by_number':
        return t('sessionGeneratedChoice.progressionByNumber')
      default:
        return ''
    }
  })

  /** What a heard question says it plays: a cadence, the tonic alone, or a progression in a key not told. */
  function heardSubtitle(heard: Playback): string {
    if (question.value.way === 'progression_by_number') return t('sessionGeneratedChoice.heard.progression')
    const given = heard.bars.filter((bar) => bar.numeral !== null).length
    return given > 1 ? t('sessionGeneratedChoice.heard.cadence') : t('sessionGeneratedChoice.heard.tonic')
  }

  /** The sound of a question asked by ear: its bars in their voicings, and on bass their roots. */
  function progressionOf(heard: Playback): DrillQuestionView['progression'] {
    const chordInstrument = instrument.value
    if (!chordInstrument) return undefined
    const bass = bassInstrument.value
    return {
      source: {
        chords: heard.bars.map((bar) => boxes.value[bar.chord]!.diagram),
        chordInstrument,
        bass: bass ? { instrument: bass, roots: heard.bars.map((bar) => rootOf(bar.chord)) } : null,
        tempoBpm: heard.tempo_bpm,
      },
      bars: heard.bars.map((bar) => (bar.numeral === null ? null : numeralLabel(bar.numeral))),
      subtitle: heardSubtitle(heard),
    }
  }

  const view = computed<DrillQuestionView | null>(() => {
    if (status.value !== 'ready') return null
    const q = question.value
    const options: DrillQuestionOption[] = q.options.map((option) => {
      switch (q.way) {
        case 'numeral_to_chord':
        case 'function_to_chord':
          return { value: option.value, label: option.value, chord: chordOf(option.value) }
        case 'chord_to_numeral':
        case 'see_then_name':
        case 'cadence_then_chord':
          return { value: option.value, label: numeralLabel(option.value) }
        case 'numbers_to_chart':
          return { value: option.value, label: option.value, chart: option.chart.map(chordOf) }
        default:
          return { value: option.value, label: option.name ?? option.value }
      }
    })
    const chordsOfKey = q.way === 'numeral_to_chord' || q.way === 'function_to_chord'
    const isChart = toValue(item).kind === 'chart_progression'
    return {
      way: q.way,
      instrument: q.drawn_as === 'chord_boxes' ? 'guitar' : 'bass',
      context: isChart ? t('sessionGeneratedChoice.keyOf', { key: keyName.value }) : chordsOfKey ? t('sessionGeneratedChoice.chordsOfKey', { key: keyName.value }) : undefined,
      chord: q.chord ? chordOf(q.chord) : undefined,
      chart: q.chart.length > 0 ? q.chart.map(chordOf) : undefined,
      progression: playback.value ? progressionOf(playback.value) : undefined,
      options,
    }
  })

  /**
   * The question as the grader reads it: its numeral or progression comes from the item it asks. A
   * diatonic chord or chord function names its key and numeral; a heard chord only its numeral,
   * and a progression only its key in the catalog.
   */
  const grading = computed<GeneratedChoiceGrading>(() => {
    const { kind, item_key: itemKey } = toValue(item)
    const [, first, second] = itemKey.split(':')
    const q = question.value
    if (isProgression.value) return { question: { way: q.way, key: q.music_key, progression: first }, catalog: catalog.value }
    const asked: GeneratedQuestion = { way: q.way, key: q.music_key, numeral: kind === 'heard_chord' ? first : second }
    return { question: asked, catalog: {} }
  })

  return { status, view, instrument: computed(() => (boxesNeeded.value ? instrument.value : null)), prompt, grading }
}
