import { computed, ref, shallowRef } from 'vue'

import type { useDiagramForm } from '@/features/teacher/composables/useDiagramForm'
import { frettedPitch } from '@/shared/utils/pitch'
import { describeNoteValue, MAX_TEMPO_BPM, MIN_TEMPO_BPM, noteValue } from '@/shared/utils/sequence'
import type { BaseNoteValue, Tuplet } from '@/shared/utils/sequence'
import type { components } from '@/api/generated/core-domain'

type SequenceStep = components['schemas']['SequenceStep']
type DiagramMode = components['schemas']['DiagramMode']
type TimeSignature = components['schemas']['TimeSignature']
type Strum = NonNullable<SequenceStep['strum']>

/**
 * Editing the steps of the playback the form is editing: the note value
 * being written (a plain note, dotted, or one note of a triplet or
 * quintuplet), which step is selected, and whether clicks on the fretboard
 * add steps (recording) — each as a new step after the selected one, or, as a
 * chord, into the selected step itself.
 *
 * While recording, the value picked is the next note's, as in notation
 * software's note input. Otherwise picking a value changes the selected
 * step's, and selecting a step shows its value on the palette.
 *
 * The selection is the step itself, not its place: it stays on that step when
 * others move or are removed — here or by the form, as when a removed position
 * takes its steps with it — and clears once the step is removed or replaced.
 */
export function useDiagramSequence(form: ReturnType<typeof useDiagramForm>) {
  const base = ref<BaseNoteValue>(8)
  const dotted = ref(false)
  const tuplet = ref<Tuplet | null>(null)
  const selected = shallowRef<SequenceStep | null>(null)
  const recording = ref(false)
  const chord = ref(false)

  const currentValue = computed(() => noteValue(base.value, { dotted: dotted.value, tuplet: tuplet.value }))

  const selectedIndex = computed(() => {
    const index = selected.value ? form.sequence.value.indexOf(selected.value) : -1
    return index === -1 ? null : index
  })
  const selectedPositionIds = computed(() =>
    selectedIndex.value === null ? [] : (form.sequence.value[selectedIndex.value]?.position_ids ?? []),
  )

  function selectAt(index: number | null) {
    selected.value = index === null ? null : (form.sequence.value[index] ?? null)
  }

  function pitchOf(positionId: string): number {
    const position = form.positions.value.find((p) => p.id === positionId)
    return (position && frettedPitch(form.tuning.value, position.string, position.fret)) ?? Number.POSITIVE_INFINITY
  }

  /** `positionIds` lowest pitch first — how a chord is read; a position without a pitch keeps its place last. */
  function inPitchOrder(positionIds: string[]): string[] {
    return positionIds
      .map((id, order) => ({ id, order, pitch: pitchOf(id) }))
      .sort((a, b) => a.pitch - b.pitch || a.order - b.order)
      .map(({ id }) => id)
  }

  /** Replaces step `index` with `change`'s result, or removes it on null; a selected step stays selected as changed. */
  function replaceStep(index: number, change: (step: SequenceStep) => SequenceStep | null) {
    const wasSelected = selectedIndex.value === index
    let kept = false
    form.setSequence(
      form.sequence.value.flatMap((step, i) => {
        if (i !== index) return [step]
        const changed = change(step)
        kept = changed !== null
        return changed ? [changed] : []
      }),
    )
    if (wasSelected) selectAt(kept ? index : null)
  }

  function applyValueToSelection() {
    if (!recording.value && selectedIndex.value !== null) replaceStep(selectedIndex.value, (step) => ({ ...step, value: currentValue.value }))
  }

  function setBase(next: BaseNoteValue) {
    base.value = next
    applyValueToSelection()
  }

  function toggleDotted() {
    dotted.value = !dotted.value
    if (dotted.value) tuplet.value = null
    applyValueToSelection()
  }

  function setTuplet(next: Tuplet | null) {
    tuplet.value = next
    if (next) dotted.value = false
    applyValueToSelection()
  }

  function selectStep(index: number) {
    if (selectedIndex.value === index) {
      selectAt(null)
      return
    }
    selectAt(index)
    const parts = describeNoteValue(form.sequence.value[index]?.value ?? currentValue.value)
    if (parts) {
      base.value = parts.base
      dotted.value = parts.dotted
      tuplet.value = parts.tuplet
    }
  }

  /** Puts `step` right after the selected step (or last), and selects it. */
  function insertStep(step: SequenceStep) {
    const at = selectedIndex.value === null ? form.sequence.value.length : selectedIndex.value + 1
    const steps = [...form.sequence.value]
    steps.splice(at, 0, step)
    form.setSequence(steps)
    selectAt(at)
  }

  function pickPosition(positionId: string) {
    if (chord.value && selectedIndex.value !== null) {
      replaceStep(selectedIndex.value, (step) => {
        const positionIds = step.position_ids.includes(positionId)
          ? step.position_ids.filter((id) => id !== positionId)
          : inPitchOrder([...step.position_ids, positionId])
        return positionIds.length > 0 ? { ...step, position_ids: positionIds } : null
      })
      return
    }
    insertStep({ position_ids: [positionId], value: currentValue.value, strum: 'none' })
  }

  /** A rest of `restBase` (or the palette's value), dotted or in a tuplet as the palette is. */
  function addRest(restBase: BaseNoteValue = base.value) {
    const value = noteValue(restBase, { dotted: dotted.value, tuplet: tuplet.value })
    insertStep({ position_ids: [], value, strum: 'none' })
  }

  /** Every position once, lowest pitch first — a scale run to start from. Only for an empty playback. */
  function fillFromPositions() {
    if (form.sequence.value.length > 0) return
    const ids = inPitchOrder(form.positions.value.map((position) => position.id))
    form.setSequence(ids.map((id) => ({ position_ids: [id], value: currentValue.value, strum: 'none' })))
    selectAt(null)
  }

  function setStrum(index: number, strum: Strum) {
    replaceStep(index, (step) => ({ ...step, strum }))
  }

  function moveStep(index: number, offset: number) {
    const to = index + offset
    if (to < 0 || to >= form.sequence.value.length) return
    const steps = [...form.sequence.value]
    const [moved] = steps.splice(index, 1)
    if (!moved) return
    steps.splice(to, 0, moved)
    form.setSequence(steps)
  }

  /** Moves step `from` into gap `gap` — 0 is before the first step, the step count after the last. */
  function moveStepTo(from: number, gap: number) {
    if (gap === from || gap === from + 1) return
    const to = gap > from ? gap - 1 : gap
    moveStep(from, to - from)
  }

  /**
   * Sounds step `from`'s positions in step `into` as well, lowest pitch first,
   * and removes step `from`. The target keeps its own value and strum; a rest
   * has no positions to give, so dropping one merges nothing.
   */
  function mergeSteps(from: number, into: number) {
    const source = form.sequence.value[from]
    const target = form.sequence.value[into]
    if (from === into || !source || !target || source.position_ids.length === 0) return
    const merged = inPitchOrder([...new Set([...target.position_ids, ...source.position_ids])])
    form.setSequence(
      form.sequence.value.flatMap((step, i) => {
        if (i === from) return []
        return i === into ? [{ ...step, position_ids: merged }] : [step]
      }),
    )
    selectAt(into > from ? into - 1 : into)
  }

  function removeStep(index: number) {
    replaceStep(index, () => null)
  }

  function clear() {
    form.setSequence([])
    selectAt(null)
  }

  /** A whole number of BPM within the range a playback accepts; there's no tempo without a playback. */
  function setTempo(bpm: number) {
    if (form.selectedPlaybackId.value === null || !Number.isFinite(bpm)) return
    form.tempoBpm.value = Math.min(MAX_TEMPO_BPM, Math.max(MIN_TEMPO_BPM, Math.round(bpm)))
  }

  function setTimeSignature(signature: TimeSignature) {
    form.timeSignature.value = { ...signature }
  }

  function setMode(mode: DiagramMode | null) {
    form.mode.value = mode
  }

  /** Chords are added to by recording, so they stop with it. */
  function toggleRecording() {
    recording.value = !recording.value
    if (!recording.value) chord.value = false
  }

  function toggleChord() {
    chord.value = !chord.value
  }

  return {
    base,
    dotted,
    tuplet,
    currentValue,
    selectedIndex,
    selectedPositionIds,
    recording,
    chord,
    setBase,
    toggleDotted,
    setTuplet,
    selectStep,
    pickPosition,
    addRest,
    fillFromPositions,
    setStrum,
    moveStep,
    moveStepTo,
    mergeSteps,
    removeStep,
    clear,
    setTempo,
    setTimeSignature,
    setMode,
    toggleRecording,
    toggleChord,
  }
}
