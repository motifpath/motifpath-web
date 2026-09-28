import { computed, ref } from 'vue'

import { INTERVAL_CODES } from '@/shared/utils/intervalLabels'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']

/**
 * The diagram reference a teacher is building in the embed picker: which
 * diagram, whether its interval labels show, and which of its intervals show.
 *
 * Reopening an existing ref restores its labels and subset once its own
 * diagram is chosen (loaded), and keeps every setting the picker doesn't edit
 * (styling, root override, playback…). Choosing a different diagram starts a
 * fresh ref, since those settings were authored for the old one.
 *
 * With `answers`, the ref is an exercise stimulus: the teacher also picks
 * which of the shown intervals are correct (at least one), written as
 * correct_intervals. Without it, a ref never carries answers.
 */
export function useDiagramEmbedDraft(initial: DiagramRef | null, options: { answers?: boolean } = {}) {
  const answers = options.answers ?? false
  const diagram = ref<Diagram | null>(null)
  const showLabels = ref(true)
  const selectedIntervals = ref<IntervalCode[]>([])
  const correctIntervals = ref<IntervalCode[]>([])
  let base: DiagramRef | null = null

  const availableIntervals = computed<IntervalCode[]>(() => {
    const present = new Set(diagram.value?.positions.map((p) => p.interval) ?? [])
    return INTERVAL_CODES.filter((code) => present.has(code))
  })

  function select(next: Diagram) {
    diagram.value = next
    base = initial && initial.diagram_id === next.diagram_id ? initial : null
    showLabels.value = base?.layers.intervals ?? true
    const subset = base?.layers.subset
    selectedIntervals.value = subset
      ? availableIntervals.value.filter((code) => subset.includes(code))
      : [...availableIntervals.value]
    const correct = base?.correct_intervals ?? []
    correctIntervals.value = selectedIntervals.value.filter((code) => correct.includes(code))
  }

  function toggleLabels() {
    showLabels.value = !showLabels.value
  }

  function toggleInterval(code: IntervalCode) {
    const selected = new Set(selectedIntervals.value)
    if (selected.has(code)) selected.delete(code)
    else selected.add(code)
    selectedIntervals.value = availableIntervals.value.filter((c) => selected.has(c))
    correctIntervals.value = correctIntervals.value.filter((c) => selected.has(c))
  }

  function toggleCorrect(code: IntervalCode) {
    const correct = new Set(correctIntervals.value)
    if (correct.has(code)) correct.delete(code)
    else correct.add(code)
    correctIntervals.value = selectedIntervals.value.filter((c) => correct.has(c))
  }

  const canShow = computed(() => diagram.value !== null && selectedIntervals.value.length > 0)
  const canApply = computed(() => canShow.value && (!answers || correctIntervals.value.length > 0))

  /** The ref to embed, or null while there's nothing that could be shown (or, for a stimulus, no answer yet). */
  function toRef(): DiagramRef | null {
    return canApply.value ? buildRef() : null
  }

  /** The ref as it would draw, answers or not — for a live preview. */
  function toPreviewRef(): DiagramRef | null {
    return canShow.value ? buildRef() : null
  }

  function buildRef(): DiagramRef | null {
    if (!diagram.value) return null
    const everyInterval = selectedIntervals.value.length === availableIntervals.value.length
    // Answers are only ever this draft's own: never kept from a reopened ref.
    const kept: Partial<DiagramRef> = { ...base }
    delete kept.correct_intervals
    return {
      ...kept,
      diagram_id: diagram.value.diagram_id,
      layers: {
        ...base?.layers,
        intervals: showLabels.value,
        subset: everyInterval ? null : [...selectedIntervals.value],
      },
      ...(answers ? { correct_intervals: [...correctIntervals.value] } : {}),
    }
  }

  return {
    diagram,
    showLabels,
    selectedIntervals,
    correctIntervals,
    availableIntervals,
    canShow,
    canApply,
    select,
    toggleLabels,
    toggleInterval,
    toggleCorrect,
    toRef,
    toPreviewRef,
  }
}
