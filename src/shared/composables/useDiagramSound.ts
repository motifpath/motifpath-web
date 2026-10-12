import { computed, ref, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { components as EventComponents } from '@/api/generated/event-ingestion'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'

type DiagramRef = components['schemas']['DiagramRef']
type MissingReason = EventComponents['schemas']['NotAnsweredResponse']['reason']

export type DiagramSoundStatus = 'loading' | 'ready' | 'missing'

/**
 * A diagram played as an exercise's sound, never drawn: it loads the diagram and checks its voice
 * up front, so a sound that can't be heard is known before the student answers. It is `missing`
 * when the diagram or its voice can't be loaded, or Play can't load the sound (`failed_to_load`,
 * which a fresh try may fix), or when the diagram can't be played here (`unavailable`). Plays the
 * playback the exercise chose at its tempo, which the student may change for this showing.
 */
export function useDiagramSound(sound: MaybeRefOrGetter<DiagramRef>) {
  const embedded = useEmbeddedDiagram(() => ({ kind: 'single', ref: toValue(sound) }))
  const { diagram, instrument } = embedded

  const player = useDiagramPlayback(() =>
    diagram.value && instrument.value
      ? { diagram: diagram.value, instrument: instrument.value, playback: toValue(sound).playback ?? null }
      : null,
  )

  /** The playback the exercise plays. */
  const played = computed(() => (diagram.value ? resolvePlayback(diagram.value, toValue(sound).playback?.playback_id) : null))
  /** The tempo the exercise plays it at, whatever the student picks. */
  const soundTempo = computed(() => toValue(sound).playback?.tempo_bpm ?? played.value?.tempo_bpm ?? null)

  const voiceMissing = ref(false)
  const voiceReady = ref(false)

  watch(
    embedded.status,
    async (status) => {
      voiceMissing.value = false
      voiceReady.value = false
      if (status !== 'ready' || !player.canPlay.value) return
      const ok = await player.checkVoice()
      if (embedded.status.value !== 'ready') return
      voiceReady.value = ok
      voiceMissing.value = !ok
    },
    { immediate: true },
  )

  const missing = computed<MissingReason | null>(() => {
    if (embedded.status.value === 'unavailable') return embedded.failed.value ? 'failed_to_load' : 'unavailable'
    if (embedded.status.value === 'ready' && !player.canPlay.value) return 'unavailable'
    if (voiceMissing.value || player.state.value === 'error') return 'failed_to_load'
    return null
  })

  const status = computed<DiagramSoundStatus>(() => {
    if (missing.value) return 'missing'
    return voiceReady.value ? 'ready' : 'loading'
  })

  return { ...player, status, missing, diagram, instrument, played, soundTempo }
}
