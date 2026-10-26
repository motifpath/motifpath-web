import { ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { MessageKey } from '@/i18n'
import { useApi } from '@/shared/composables/useApi'
import { fetchDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']
type GeneratedWay = NonNullable<Item['generated_choice']>['way']

/** How a harmony question is called, by the way it is asked: its answer is never named. */
const HARMONY_LABELS: Partial<Record<GeneratedWay, MessageKey>> = {
  numeral_to_chord: 'sessionPlan.drills.numeralToChord',
  chord_to_numeral: 'sessionPlan.drills.chordToNumeral',
  chord_to_function: 'sessionPlan.drills.chordToFunction',
  function_to_chord: 'sessionPlan.drills.functionToChord',
  chart_to_numbers: 'sessionPlan.drills.chartToNumbers',
  numbers_to_chart: 'sessionPlan.drills.numbersToChart',
  cadence_then_chord: 'sessionPlan.drills.cadenceThenChord',
  see_then_name: 'sessionPlan.drills.chordToNumeral',
  progression_by_number: 'sessionPlan.drills.progressionByNumber',
}
type LocalizedNames = components['schemas']['LocalizedNames']

/**
 * What each item of a session plan is called, so the student always knows what they're
 * practising: an exercise by its title, a play-along by its diagram's name once the diagram has
 * loaded. A fretboard cell has no name of its own; its drill says what it is. Nor has a diagram
 * shape: its diagram's name would give away the shape to name. A harmony question is called by
 * the way it is asked, which never names its answer. A chord item is called by its chords, since
 * playing them is the skill, a progression key tour or a guide tone by its progression, and a song
 * by its title.
 */
export function usePlanItemNames(items: MaybeRefOrGetter<Item[]>) {
  const { coreApi } = useApi()
  const { localizedName } = useLocalizedName()
  const { t } = useTypedT()
  const diagramNames = ref<Record<string, LocalizedNames>>({})

  watch(
    () => toValue(items).flatMap((item) => (item.play_along ? [item.play_along.diagram_id] : [])),
    (diagramIds) => {
      for (const diagramId of new Set(diagramIds)) {
        if (diagramNames.value[diagramId]) continue
        void fetchDiagram(coreApi, diagramId).then((diagram) => {
          if (diagram) diagramNames.value = { ...diagramNames.value, [diagramId]: diagram.names }
        })
      }
    },
    { immediate: true },
  )

  /** The item's name; null for a fretboard cell, a diagram shape, or a play-along whose diagram isn't loaded. */
  function nameOf(item: Item): string | null {
    if (item.exercise) return item.exercise.title
    if (item.progression_keys) return t('sessionPlan.tour', { name: item.progression_keys.progression.name })
    if (item.guide_tone) return item.guide_tone.progression.name
    if (item.song) return item.song.title
    const chords = chordNameOf(item)
    if (chords) return chords
    const names = item.play_along && diagramNames.value[item.play_along.diagram_id]
    return names ? localizedName(names) : null
  }

  /** What a chord item plays, named; null for any other item. */
  function chordNameOf(item: Item): string | null {
    if (item.chord_voicing) return t('sessionPlan.chords.voicing', { chord: item.chord_voicing.chord_symbol })
    if (item.root_fifth) return t('sessionPlan.chords.rootFifth', { chord: item.root_fifth.chord_symbol })
    const change = item.chord_change ?? item.root_change
    if (!change) return null
    const pair = { from: change.from_chord_symbol, to: change.to_chord_symbol }
    return item.chord_change ? t('sessionPlan.chords.change', pair) : t('sessionPlan.chords.rootChange', pair)
  }

  /** What to call the item on screen: its name, its drill for a fretboard cell or a shape, or its kind until named. */
  function labelOf(item: Item): string {
    const name = nameOf(item)
    if (name) return name
    if (item.fretboard_cell) {
      return item.fretboard_cell.drill === 'name_the_note' ? t('sessionPlan.drills.nameTheNote') : t('sessionPlan.drills.findTheNote')
    }
    if (item.diagram_shape) {
      return item.diagram_shape.drill === 'name_the_shape' ? t('sessionPlan.drills.nameTheShape') : t('sessionPlan.drills.findTheDegree')
    }
    if (item.generated_choice) return t(HARMONY_LABELS[item.generated_choice.way] ?? 'sessionPlan.playAlong')
    return t('sessionPlan.playAlong')
  }

  return { nameOf, labelOf }
}
