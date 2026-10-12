<script setup lang="ts">
/**
 * How a diagram plays as a listening exercise's sound: which of its playbacks (the diagram's
 * default to start with, always kept by its id), the tempo (blank plays the playback's own), the
 * sound (voice) and the direction. It never loops: students replay it themselves. The board is
 * shown to the author, never to students before they answer, and Hear it plays exactly what
 * students will hear, lighting the positions as they sound. The length shown is what a student's
 * answer is timed against.
 *
 * Reports the sound on every change, or null while the tempo can't be played.
 */
import { EyeOff, Play, Square } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useListVoices } from '@/shared/composables/useListVoices'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'
import { diagramSoundSeconds } from '@/shared/utils/exerciseAudio'
import { isValidTempoBpm, MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '@/shared/utils/sequence'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type DiagramRef = components['schemas']['DiagramRef']
type Instrument = components['schemas']['Instrument']
type Playback = NonNullable<DiagramRef['playback']>
type Direction = Playback['direction']

const props = defineProps<{
  diagram: Diagram
  instrument: Instrument
  /** The sound being edited; null for a diagram just picked. */
  initial: DiagramRef | null
}>()

const emit = defineEmits<{ change: [sound: DiagramRef | null] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { voices } = useListVoices()

const DIRECTIONS: Direction[] = ['as_authored', 'reversed']

const start = props.initial?.playback
const playbackId = ref(resolvePlayback(props.diagram, start?.playback_id)?.playback_id ?? '')
// A number input's v-model hands back a number once typed in, and '' when cleared.
const tempoText = ref<string | number>(start?.tempo_bpm ?? '')
const voiceId = ref(start?.voice_id ?? '')
const direction = ref<Direction>(start?.direction ?? 'as_authored')

const played = computed(() => resolvePlayback(props.diagram, playbackId.value))
const tempo = computed(() => (String(tempoText.value).trim() === '' ? null : Number(tempoText.value)))
const tempoInvalid = computed(() => tempo.value !== null && !isValidTempoBpm(tempo.value))
const familyVoices = computed(() => voices.value.filter((voice) => voice.family === props.instrument.family))

const sound = computed<DiagramRef>(() => ({
  diagram_id: props.diagram.diagram_id,
  layers: props.initial?.layers ?? { intervals: true },
  playback: {
    playback_id: playbackId.value,
    ...(tempo.value !== null && !tempoInvalid.value ? { tempo_bpm: tempo.value } : {}),
    ...(voiceId.value ? { voice_id: voiceId.value } : {}),
    direction: direction.value,
    loop: false,
  },
}))

watch(
  () => JSON.stringify([sound.value, tempoInvalid.value]),
  () => emit('change', tempoInvalid.value ? null : sound.value),
  { immediate: true },
)

/** The length students hear, as m:ss. */
const length = computed(() => {
  const seconds = Math.round(diagramSoundSeconds(props.diagram, sound.value) ?? 0)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

const hearing = useDiagramPlayback(() => ({ diagram: props.diagram, instrument: props.instrument, playback: sound.value.playback ?? null }))
const busy = computed(() => hearing.state.value === 'playing' || hearing.state.value === 'loading')

const fieldClass = 'h-12 w-full rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink'
const labelClass = 'text-sm font-semibold text-ink'
</script>

<template>
  <div data-test="sound-settings" class="flex flex-col gap-4">
    <div class="overflow-hidden rounded-[10px] border border-border bg-surface-sunken p-2">
      <EmbeddedDiagram :embed="{ kind: 'single', ref: sound }" :active-position-ids="hearing.activePositionIds.value" />
    </div>
    <p data-test="sound-hidden-note" class="flex gap-2 rounded-lg bg-accent-muted px-3 py-2.5 text-sm text-ink">
      <EyeOff :size="18" class="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
      {{ t('soundSettings.hiddenNote') }}
    </p>

    <label class="flex flex-col gap-1.5">
      <span :class="labelClass">{{ t('soundSettings.playback') }}</span>
      <select v-model="playbackId" data-test="sound-playback" :class="fieldClass">
        <option v-for="playback in diagram.playbacks" :key="playback.playback_id" :value="playback.playback_id">
          {{ localizedName(playback.names) }}
        </option>
      </select>
    </label>

    <div class="grid grid-cols-2 gap-3">
      <label class="flex flex-col gap-1.5">
        <span :class="labelClass">{{ t('soundSettings.tempo') }}</span>
        <input
          v-model="tempoText"
          data-test="sound-tempo"
          type="number"
          inputmode="numeric"
          :min="MIN_TEMPO_BPM"
          :max="MAX_TEMPO_BPM"
          :placeholder="played ? String(played.tempo_bpm) : undefined"
          :aria-invalid="tempoInvalid ? 'true' : undefined"
          :class="fieldClass"
        />
      </label>
      <div class="flex flex-col gap-1.5">
        <span :class="labelClass">{{ t('soundSettings.length') }}</span>
        <span data-test="sound-length" :class="[fieldClass, 'flex items-center tabular-nums']">{{ length }}</span>
      </div>
    </div>
    <p v-if="tempoInvalid" data-test="sound-tempo-invalid" role="alert" class="-mt-2 text-xs text-danger">
      {{ t('soundSettings.tempoInvalid', { min: MIN_TEMPO_BPM, max: MAX_TEMPO_BPM }) }}
    </p>
    <p v-else class="-mt-2 text-xs text-ink-muted">{{ t('soundSettings.tempoHint') }}</p>

    <label class="flex flex-col gap-1.5">
      <span :class="labelClass">{{ t('soundSettings.voice') }}</span>
      <select v-model="voiceId" data-test="sound-voice" :class="fieldClass">
        <option value="">{{ t('soundSettings.voiceDefault') }}</option>
        <option v-for="voice in familyVoices" :key="voice.voice_id" :value="voice.voice_id">{{ localizedName(voice.names) }}</option>
      </select>
    </label>

    <div class="flex flex-col gap-1.5" role="group" :aria-label="t('soundSettings.direction')">
      <span :class="labelClass">{{ t('soundSettings.direction') }}</span>
      <div class="flex gap-2">
        <button
          v-for="choice in DIRECTIONS"
          :key="choice"
          type="button"
          :data-test="`sound-direction-${choice}`"
          :aria-pressed="direction === choice"
          class="h-11 rounded-full border px-4 text-sm font-semibold"
          :class="direction === choice ? 'border-accent bg-accent-muted text-accent-text' : 'border-border bg-surface text-ink'"
          @click="direction = choice"
        >
          {{ t(`soundSettings.directions.${choice}`) }}
        </button>
      </div>
    </div>

    <button
      type="button"
      data-test="sound-hear-it"
      class="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-accent text-base font-semibold text-accent-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      @click="hearing.toggle"
    >
      <Square v-if="busy" :size="16" fill="currentColor" aria-hidden="true" />
      <Play v-else :size="18" aria-hidden="true" />
      {{ busy ? t('soundSettings.stop') : t('soundSettings.hearIt') }}
    </button>
  </div>
</template>
