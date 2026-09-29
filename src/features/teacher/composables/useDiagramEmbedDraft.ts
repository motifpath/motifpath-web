import { computed, ref } from 'vue'

import { effectiveLabelMode, type DiagramLabelMode } from '@/shared/utils/diagramLabels'
import { INTERVAL_CODES } from '@/shared/utils/intervalLabels'
import { isValidTempoBpm } from '@/shared/utils/sequence'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Playback = NonNullable<DiagramRef['playback']>
type PlaybackDirection = Playback['direction']

/** Whether every, none, or only some of an interval's positions are shown. */
export type IntervalVisibility = 'shown' | 'hidden' | 'mixed'

/**
 * The diagram reference a teacher is building in the embed picker: which
 * diagram, what its markers show (label mode), and which of its positions
 * are hidden — one by one, or an interval at a time.
 *
 * Reopening an existing ref restores its label mode and hidden positions
 * once its own diagram is chosen (loaded) — an older ref's label switch and
 * interval subset are read as the mode and the positions they hid — and
 * keeps every setting the picker doesn't edit (styling, root override,
 * playback…). Choosing a different diagram starts a fresh ref, drawn as its
 * author made it.
 *
 * With `answers`, the ref is an exercise stimulus: the teacher also marks
 * which positions are correct (at least one), drawn or hidden, since the
 * student looks for them on the fretboard. Without it, a ref never carries
 * answers, and must draw at least one position.
 *
 * A diagram with a sequence can also be offered for playing: tempo and voice
 * overrides (null keeps the diagram's tempo and the instrument's voice),
 * direction and loop. A fresh ref offers Play; a reopened one keeps its
 * choice. A diagram without a sequence never plays, so its ref's playback is
 * left as it was.
 */
export function useDiagramEmbedDraft(initial: DiagramRef | null, options: { answers?: boolean } = {}) {
  const answers = options.answers ?? false
  const diagram = ref<Diagram | null>(null)
  const label = ref<DiagramLabelMode>('custom')
  const hiddenPositionIds = ref<string[]>([])
  const correctPositionIds = ref<string[]>([])
  const playbackOffered = ref(false)
  const playbackTempo = ref<number | null>(null)
  const playbackVoiceId = ref<string | null>(null)
  const playbackDirection = ref<PlaybackDirection>('as_authored')
  const playbackLoop = ref(false)
  let base: DiagramRef | null = null

  const positionIds = computed(() => diagram.value?.positions.map((p) => p.position_id ?? '') ?? [])

  const availableIntervals = computed<IntervalCode[]>(() => {
    const present = new Set(diagram.value?.positions.map((p) => p.interval) ?? [])
    return INTERVAL_CODES.filter((code) => present.has(code))
  })

  /** ids in the diagram's own position order, so what's written is stable. */
  function inPositionOrder(ids: Iterable<string>): string[] {
    const wanted = new Set(ids)
    return positionIds.value.filter((id) => wanted.has(id))
  }

  function positionsOf(code: IntervalCode): string[] {
    return (diagram.value?.positions ?? []).filter((p) => p.interval === code).map((p) => p.position_id ?? '')
  }

  function select(next: Diagram) {
    diagram.value = next
    base = initial && initial.diagram_id === next.diagram_id ? initial : null
    label.value = base ? effectiveLabelMode(base, next.label_display) : 'custom'

    const subset = base?.layers.subset
    const hidden = new Set(base?.layers.hidden_position_ids ?? [])
    for (const position of next.positions) {
      if (subset && !subset.includes(position.interval)) hidden.add(position.position_id ?? '')
    }
    hiddenPositionIds.value = inPositionOrder(hidden)

    const correct = base?.correct_position_ids
      ?? next.positions
        .filter((p) => !hidden.has(p.position_id ?? '') && (base?.correct_intervals ?? []).includes(p.interval))
        .map((p) => p.position_id ?? '')
    correctPositionIds.value = inPositionOrder(correct)

    // A reopened ref without playback offered none; a fresh one offers it.
    const playback = base ? (base.playback ?? null) : null
    playbackOffered.value = base ? playback !== null : true
    playbackTempo.value = playback?.tempo_bpm ?? null
    playbackVoiceId.value = playback?.voice_id ?? null
    playbackDirection.value = playback?.direction ?? 'as_authored'
    playbackLoop.value = playback?.loop ?? false
  }

  const canConfigurePlayback = computed(() => (diagram.value?.sequence.length ?? 0) > 0)

  function setPlaybackOffered(offered: boolean) {
    playbackOffered.value = offered
  }

  /** null plays at the diagram's own tempo. */
  function setPlaybackTempo(bpm: number | null) {
    playbackTempo.value = bpm
  }

  /** null plays with the instrument's default voice. */
  function setPlaybackVoice(voiceId: string | null) {
    playbackVoiceId.value = voiceId
  }

  function setPlaybackDirection(direction: PlaybackDirection) {
    playbackDirection.value = direction
  }

  function setPlaybackLoop(loop: boolean) {
    playbackLoop.value = loop
  }

  const playbackTempoInvalid = computed(() => {
    const bpm = playbackTempo.value
    return bpm !== null && !isValidTempoBpm(bpm)
  })

  function setLabel(mode: DiagramLabelMode) {
    label.value = mode
  }

  function toggle(list: typeof hiddenPositionIds, id: string) {
    const ids = new Set(list.value)
    if (ids.has(id)) ids.delete(id)
    else ids.add(id)
    list.value = inPositionOrder(ids)
  }

  function togglePosition(id: string) {
    toggle(hiddenPositionIds, id)
  }

  function togglePositionCorrect(id: string) {
    toggle(correctPositionIds, id)
  }

  function intervalState(code: IntervalCode): IntervalVisibility {
    const ids = positionsOf(code)
    const hiddenCount = ids.filter((id) => hiddenPositionIds.value.includes(id)).length
    if (hiddenCount === 0) return 'shown'
    return hiddenCount === ids.length ? 'hidden' : 'mixed'
  }

  /** Hides every position of an interval while any shows; shows them all once none does. */
  function toggleIntervalVisibility(code: IntervalCode) {
    const ids = positionsOf(code)
    const hidden = new Set(hiddenPositionIds.value)
    if (intervalState(code) === 'hidden') ids.forEach((id) => hidden.delete(id))
    else ids.forEach((id) => hidden.add(id))
    hiddenPositionIds.value = inPositionOrder(hidden)
  }

  const drawnCount = computed(() => positionIds.value.length - hiddenPositionIds.value.length)
  const canShow = computed(() => diagram.value !== null && (answers || drawnCount.value > 0))
  const playbackValid = computed(
    () => !canConfigurePlayback.value || !playbackOffered.value || !playbackTempoInvalid.value,
  )
  const canApply = computed(
    () => canShow.value && (!answers || correctPositionIds.value.length > 0) && playbackValid.value,
  )

  /** The ref to embed, or null while it couldn't be (nothing drawn, or, for a stimulus, no answer yet). */
  function toRef(): DiagramRef | null {
    return canApply.value ? buildRef() : null
  }

  /** The ref as it would draw, answers or not and even with nothing drawn — for a live preview,
   *  where hidden positions can be shown again. */
  function toPreviewRef(): DiagramRef | null {
    return buildRef()
  }

  function buildRef(): DiagramRef | null {
    if (!diagram.value) return null
    // Answers are only ever this draft's own: never kept from a reopened ref.
    const kept: Partial<DiagramRef> = { ...base }
    delete kept.correct_position_ids
    delete kept.correct_intervals
    return {
      ...kept,
      diagram_id: diagram.value.diagram_id,
      layers: {
        ...base?.layers,
        label: label.value,
        // Kept in step for readers from before label modes.
        intervals: label.value !== 'none',
        hidden_position_ids: hiddenPositionIds.value.length > 0 ? [...hiddenPositionIds.value] : null,
        subset: null,
      },
      ...(canConfigurePlayback.value ? { playback: buildPlayback() } : {}),
      ...(answers ? { correct_position_ids: [...correctPositionIds.value] } : {}),
    }
  }

  function buildPlayback(): Playback | null {
    if (!playbackOffered.value) return null
    return {
      tempo_bpm: playbackTempo.value,
      voice_id: playbackVoiceId.value,
      direction: playbackDirection.value,
      loop: playbackLoop.value,
    }
  }

  return {
    diagram,
    label,
    hiddenPositionIds,
    correctPositionIds,
    playbackOffered,
    playbackTempo,
    playbackVoiceId,
    playbackDirection,
    playbackLoop,
    playbackTempoInvalid,
    canConfigurePlayback,
    availableIntervals,
    canShow,
    canApply,
    select,
    setLabel,
    togglePosition,
    togglePositionCorrect,
    intervalState,
    toggleIntervalVisibility,
    setPlaybackOffered,
    setPlaybackTempo,
    setPlaybackVoice,
    setPlaybackDirection,
    setPlaybackLoop,
    toRef,
    toPreviewRef,
  }
}
