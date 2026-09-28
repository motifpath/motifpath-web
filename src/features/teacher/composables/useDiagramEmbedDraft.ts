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
 */
export function useDiagramEmbedDraft(initial: DiagramRef | null) {
  const diagram = ref<Diagram | null>(null)
  const showLabels = ref(true)
  const selectedIntervals = ref<IntervalCode[]>([])
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
  }

  function toggleLabels() {
    showLabels.value = !showLabels.value
  }

  function toggleInterval(code: IntervalCode) {
    const selected = new Set(selectedIntervals.value)
    if (selected.has(code)) selected.delete(code)
    else selected.add(code)
    selectedIntervals.value = availableIntervals.value.filter((c) => selected.has(c))
  }

  const canApply = computed(() => diagram.value !== null && selectedIntervals.value.length > 0)

  /** The ref to embed, or null while there's nothing that could be shown. */
  function toRef(): DiagramRef | null {
    if (!diagram.value || !canApply.value) return null
    const everyInterval = selectedIntervals.value.length === availableIntervals.value.length
    return {
      ...base,
      diagram_id: diagram.value.diagram_id,
      layers: {
        ...base?.layers,
        intervals: showLabels.value,
        subset: everyInterval ? null : [...selectedIntervals.value],
      },
    }
  }

  return { diagram, showLabels, selectedIntervals, availableIntervals, canApply, select, toggleLabels, toggleInterval, toRef }
}
