import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
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

export type GeneratedQuestionStatus = 'loading' | 'ready' | 'unavailable'

/** What grading an answer needs: the question as the grader reads it, and the catalog for charts. */
export interface GeneratedGrading {
  question: GeneratedQuestion
  catalog: ProgressionCatalog
}

/** A box loaded for a chord: the voicing's diagram, which carries its fingering. */
interface LoadedBox {
  diagram: Diagram
}

/**
 * A generated harmony question of a session, as the screen asks it: the prompt, what it shows and
 * its options, drawn as the plan reads chords (boxes on guitar, symbols on bass). On a guitar
 * reading it loads every box the plan names, and the instrument they are drawn on; a chart
 * question loads the progression catalog it is graded against. It is unavailable when any of that
 * can't be loaded, so it can be skipped and never counted wrong.
 */
export function useGeneratedQuestion(item: MaybeRefOrGetter<Item>) {
  const { coreApi } = useApi()
  const { t } = useTypedT()
  const { load: loadCatalog } = useProgressionCatalog()

  const question = computed<Question>(() => toValue(item).generated_choice!)
  const boxesNeeded = computed(() => question.value.drawn_as === 'chord_boxes')
  const isChart = computed(() => toValue(item).kind === 'chart_progression')

  const status = ref<GeneratedQuestionStatus>('loading')
  const boxes = ref<Record<string, LoadedBox>>({})
  const instrument = ref<Instrument | null>(null)
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

  async function loadBoxes(planned: Question): Promise<boolean> {
    if (planned.drawn_as !== 'chord_boxes') return true
    const loaded = await Promise.all(planned.voicings.map(async (box) => [box.chord, await fetchDiagram(coreApi, box.diagram_id)] as const))
    const found: Record<string, LoadedBox> = {}
    for (const [chord, diagram] of loaded) {
      if (!diagram?.chord_voicing) return false
      found[chord] = { diagram }
    }
    if (chordsDrawn(planned).some((chord) => !found[chord])) return false
    const drawnOn = loaded[0]?.[1]?.instrument_id
    const { data } = await fetchInstruments(coreApi)
    const onInstrument = data?.find((candidate) => candidate.instrument_id === drawnOn) ?? null
    if (!onInstrument) return false
    boxes.value = found
    instrument.value = onInstrument
    return true
  }

  watch(
    () => toValue(item).item_key + (toValue(item).generated_choice?.way ?? ''),
    async () => {
      const planned = question.value
      const needsCatalog = isChart.value
      status.value = boxesNeeded.value || needsCatalog ? 'loading' : 'ready'
      if (status.value === 'ready') return
      const [boxesLoaded, loadedCatalog] = await Promise.all([loadBoxes(planned), needsCatalog ? loadCatalog() : Promise.resolve({})])
      if (planned !== question.value) return
      if (loadedCatalog) catalog.value = loadedCatalog
      status.value = boxesLoaded && loadedCatalog ? 'ready' : 'unavailable'
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
        return t('sessionGeneratedChoice.chordToNumeral', { key })
      case 'chord_to_function':
        return t('sessionGeneratedChoice.chordToFunction', { key, chord: q.chord ?? '' })
      case 'function_to_chord':
        return t('sessionGeneratedChoice.functionToChord', { key, function: t(`sessionGeneratedChoice.functions.${q.function ?? 'tonic'}`) })
      case 'chart_to_numbers':
        return t('sessionGeneratedChoice.chartToNumbers')
      case 'numbers_to_chart':
        return t('sessionGeneratedChoice.numbersToChart', { progression: q.progression?.name ?? '' })
      default:
        return ''
    }
  })

  const view = computed<DrillQuestionView | null>(() => {
    if (status.value !== 'ready') return null
    const q = question.value
    const options: DrillQuestionOption[] = q.options.map((option) => {
      switch (q.way) {
        case 'numeral_to_chord':
        case 'function_to_chord':
          return { value: option.value, label: option.value, chord: chordOf(option.value) }
        case 'chord_to_numeral':
          return { value: option.value, label: numeralLabel(option.value) }
        case 'numbers_to_chart':
          return { value: option.value, label: option.value, chart: option.chart.map(chordOf) }
        default:
          return { value: option.value, label: option.name ?? option.value }
      }
    })
    const chordsOfKey = q.way === 'numeral_to_chord' || q.way === 'function_to_chord'
    return {
      way: q.way,
      instrument: boxesNeeded.value ? 'guitar' : 'bass',
      context: isChart.value ? t('sessionGeneratedChoice.keyOf', { key: keyName.value }) : chordsOfKey ? t('sessionGeneratedChoice.chordsOfKey', { key: keyName.value }) : undefined,
      chord: q.chord ? chordOf(q.chord) : undefined,
      chart: q.chart.length > 0 ? q.chart.map(chordOf) : undefined,
      options,
    }
  })

  /** The question as the grader reads it: its numeral or progression comes from the item it asks. */
  const grading = computed<GeneratedGrading>(() => {
    const [, first, second] = toValue(item).item_key.split(':')
    const q = question.value
    const asked: GeneratedQuestion = isChart.value
      ? { way: q.way, key: q.music_key, progression: first }
      : { way: q.way, key: q.music_key, numeral: second }
    return { question: asked, catalog: isChart.value ? catalog.value : {} }
  })

  return { status, view, instrument: computed(() => (boxesNeeded.value ? instrument.value : null)), prompt, grading }
}
