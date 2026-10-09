<script setup lang="ts">
/**
 * How one usage of a diagram shows: what its markers read (label mode) and
 * which positions are hidden, one by one on the diagram or an interval at a
 * time — drawn as a student will see it, with hidden positions faded so they
 * can be shown again. With `answers` (an exercise stimulus), a click can
 * also mark a position as a correct answer instead.
 *
 * A diagram with playbacks also gets its playback settings (offer Play, which
 * playback when it has several, tempo, voice, direction, loop), and the
 * preview plays with them.
 *
 * Edits the draft it's given; the caller reads the ref from it.
 */
import { computed, ref } from 'vue'

import type { useDiagramEmbedDraft } from '@/features/teacher/composables/useDiagramEmbedDraft'
import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useListVoices } from '@/shared/composables/useListVoices'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'
import type { DiagramLabelMode } from '@/shared/utils/diagramLabels'
import { intervalLabelKey } from '@/shared/utils/intervalLabels'
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '@/shared/utils/sequence'
import { resolvePlayback } from '@/shared/utils/diagramPlayback'
import type { IntervalCode } from '@/shared/utils/intervalLabels'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']

const props = withDefaults(
  defineProps<{
    diagram: Diagram
    /** The diagram's instrument, when a student can be shown it (fretted); null otherwise. */
    instrument: Instrument | null
    draft: ReturnType<typeof useDiagramEmbedDraft>
    /** An exercise stimulus: clicking a position can also mark it correct. */
    answers?: boolean
  }>(),
  { answers: false },
)

const { t } = useTypedT()
const { localizedName } = useLocalizedName()
const { voices, isLoading: voicesLoading, error: voicesError, retry: retryVoices } = useListVoices()

const LABEL_MODES: DiagramLabelMode[] = ['interval', 'note', 'custom', 'none']

// What a click on a marker does; a stimulus starts on its answers.
const tool = ref<'visibility' | 'correct'>(props.answers ? 'correct' : 'visibility')

const allPositionIds = computed(() => props.diagram.positions.map((p) => p.position_id ?? ''))
const previewRef = computed(() => props.draft.toPreviewRef())
const playingPositionIds = ref<string[]>([])

const DIRECTIONS = ['as_authored', 'reversed'] as const

// A usage may only pick a voice of its instrument's family.
const familyVoices = computed(() => voices.value.filter((v) => v.family === props.instrument?.family))
const defaultVoiceLabel = computed(() => {
  const found = voices.value.find((v) => v.voice_id === props.instrument?.default_voice_id)
  return found
    ? t('diagramEmbedPicker.playback.voiceDefault', { name: localizedName(found.names) })
    : t('diagramEmbedPicker.playback.voiceDefaultUnnamed')
})

// The playback this usage plays, whose own tempo applies unless overridden.
const chosenPlayback = computed(() => resolvePlayback(props.diagram, props.draft.playbackId.value))
const defaultPlaybackLabel = computed(() => {
  const fallback = resolvePlayback(props.diagram, null)
  return t('diagramEmbedPicker.playback.choiceDefault', { name: fallback ? localizedName(fallback.names) : '' })
})

function onPlaybackChoice(event: Event) {
  if (event.target instanceof HTMLSelectElement) props.draft.setPlaybackId(event.target.value || null)
}

function onPlaybackOffered(event: Event) {
  if (event.target instanceof HTMLInputElement) props.draft.setPlaybackOffered(event.target.checked)
}

function onPlaybackTempo(event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return
  const raw = event.target.value.trim()
  props.draft.setPlaybackTempo(raw === '' ? null : Number(raw))
}

function onPlaybackVoice(event: Event) {
  if (event.target instanceof HTMLSelectElement) props.draft.setPlaybackVoice(event.target.value || null)
}

function onPlaybackDirection(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  const direction = DIRECTIONS.find((d) => d === value)
  if (direction) props.draft.setPlaybackDirection(direction)
}

function onPlaybackLoop(event: Event) {
  if (event.target instanceof HTMLInputElement) props.draft.setPlaybackLoop(event.target.checked)
}

function onPositionClick(positionId: string) {
  if (tool.value === 'correct') props.draft.togglePositionCorrect(positionId)
  else props.draft.togglePosition(positionId)
}

function onLabelChange(event: Event) {
  if (!(event.target instanceof HTMLSelectElement)) return
  const value = event.target.value
  const mode = LABEL_MODES.find((m) => m === value)
  if (mode) props.draft.setLabel(mode)
}

function intervalLabel(code: IntervalCode): string {
  const key = intervalLabelKey(code)
  return key ? t(key) : code
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label for="embed-picker-label" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.labelLegend') }}</label>
        <select
          id="embed-picker-label"
          data-test="embed-picker-label"
          :value="draft.label.value"
          class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
          @change="onLabelChange"
        >
          <option v-for="mode in LABEL_MODES" :key="mode" :value="mode">{{ t(`diagramEmbedPicker.labelModes.${mode}`) }}</option>
        </select>
      </div>
      <div v-if="answers" class="flex flex-col gap-1">
        <span class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.toolLegend') }}</span>
        <div class="flex gap-1 rounded-md bg-surface-sunken p-[3px]" role="group" :aria-label="t('diagramEmbedPicker.toolLegend')">
          <button
            v-for="option in (['correct', 'visibility'] as const)"
            :key="option"
            type="button"
            :data-test="`embed-picker-tool-${option}`"
            :aria-pressed="tool === option"
            class="rounded-sm px-2.5 py-1 text-xs font-semibold"
            :class="tool === option ? 'bg-accent text-accent-fg' : 'text-ink-muted'"
            @click="tool = option"
          >
            {{ option === 'correct' ? t('diagramEmbedPicker.toolCorrect') : t('diagramEmbedPicker.toolVisibility') }}
          </button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-1.5">
      <span class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.intervalsLegend') }}</span>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="code in draft.availableIntervals.value"
          :key="code"
          type="button"
          data-test="embed-picker-interval"
          :aria-pressed="draft.intervalState(code) === 'shown' ? 'true' : draft.intervalState(code) === 'hidden' ? 'false' : 'mixed'"
          class="min-w-9 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
          :class="{
            'border-accent bg-accent text-accent-fg': draft.intervalState(code) === 'shown',
            'border-accent text-accent-text': draft.intervalState(code) === 'mixed',
            'border-border text-ink-subtle line-through': draft.intervalState(code) === 'hidden',
          }"
          @click="draft.toggleIntervalVisibility(code)"
        >
          {{ intervalLabel(code) }}
        </button>
      </div>
      <p class="text-xs text-ink-subtle">
        {{ answers && tool === 'correct' ? t('diagramEmbedPicker.clickToMarkCorrect') : t('diagramEmbedPicker.clickToHide') }}
      </p>
    </div>

    <fieldset v-if="draft.canConfigurePlayback.value" data-test="embed-picker-playback" class="flex flex-col gap-2">
      <legend class="mb-1 text-xs text-ink-subtle">{{ t('diagramEmbedPicker.playback.legend') }}</legend>
      <label class="flex items-center gap-2 text-sm">
        <input
          data-test="embed-picker-playback-offered"
          type="checkbox"
          :checked="draft.playbackOffered.value"
          @change="onPlaybackOffered"
        />
        {{ t('diagramEmbedPicker.playback.offered') }}
      </label>
      <div v-if="draft.playbackOffered.value" class="flex flex-wrap items-start gap-4">
        <div v-if="draft.playbackChoices.value.length > 0" class="flex flex-col gap-1">
          <label for="embed-picker-playback-choice" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.playback.choice') }}</label>
          <select
            id="embed-picker-playback-choice"
            data-test="embed-picker-playback-choice"
            :value="draft.playbackId.value ?? ''"
            class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            @change="onPlaybackChoice"
          >
            <option value="">{{ defaultPlaybackLabel }}</option>
            <option v-for="playback in draft.playbackChoices.value" :key="playback.playback_id" :value="playback.playback_id">
              {{ localizedName(playback.names) }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label for="embed-picker-playback-tempo" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.playback.tempo') }}</label>
          <input
            id="embed-picker-playback-tempo"
            data-test="embed-picker-playback-tempo"
            type="number"
            inputmode="numeric"
            :min="MIN_TEMPO_BPM"
            :max="MAX_TEMPO_BPM"
            step="1"
            :value="draft.playbackTempo.value ?? ''"
            :placeholder="chosenPlayback ? String(chosenPlayback.tempo_bpm) : undefined"
            :aria-invalid="draft.playbackTempoInvalid.value ? 'true' : undefined"
            aria-describedby="embed-picker-playback-tempo-hint"
            class="w-24 rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            @input="onPlaybackTempo"
          />
          <p
            v-if="draft.playbackTempoInvalid.value"
            id="embed-picker-playback-tempo-hint"
            data-test="embed-picker-playback-tempo-error"
            role="alert"
            class="max-w-48 text-xs text-danger"
          >
            {{ t('diagramEmbedPicker.playback.tempoInvalid', { min: MIN_TEMPO_BPM, max: MAX_TEMPO_BPM }) }}
          </p>
          <p v-else id="embed-picker-playback-tempo-hint" class="max-w-48 text-xs text-ink-subtle">
            {{ t('diagramEmbedPicker.playback.tempoHint') }}
          </p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="embed-picker-playback-voice" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.playback.voice') }}</label>
          <select
            id="embed-picker-playback-voice"
            data-test="embed-picker-playback-voice"
            :value="draft.playbackVoiceId.value ?? ''"
            :disabled="voicesLoading"
            :aria-busy="voicesLoading ? 'true' : undefined"
            class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            @change="onPlaybackVoice"
          >
            <option value="">{{ defaultVoiceLabel }}</option>
            <option v-for="voice in familyVoices" :key="voice.voice_id" :value="voice.voice_id">{{ localizedName(voice.names) }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label for="embed-picker-playback-direction" class="text-xs text-ink-subtle">{{ t('diagramEmbedPicker.playback.direction') }}</label>
          <select
            id="embed-picker-playback-direction"
            data-test="embed-picker-playback-direction"
            :value="draft.playbackDirection.value"
            class="rounded-md border border-border bg-surface px-2 py-1.5 text-sm"
            @change="onPlaybackDirection"
          >
            <option v-for="direction in DIRECTIONS" :key="direction" :value="direction">
              {{ t(`diagramEmbedPicker.playback.directions.${direction}`) }}
            </option>
          </select>
        </div>
        <label class="flex items-center gap-2 self-center text-sm">
          <input data-test="embed-picker-playback-loop" type="checkbox" :checked="draft.playbackLoop.value" @change="onPlaybackLoop" />
          {{ t('diagramEmbedPicker.playback.loop') }}
        </label>
      </div>
      <LoadFailed
        v-if="draft.playbackOffered.value && voicesError"
        data-test="embed-picker-playback-voices-error"
        :message="t('diagramEmbedPicker.playback.voicesError')"
        @retry="retryVoices"
      />
    </fieldset>

    <slot name="warnings" />

    <div data-test="embed-picker-preview" class="rounded-md border border-border bg-surface p-3">
      <FrettedDiagramView
        v-if="instrument && previewRef"
        :diagram="diagram"
        :instrument="instrument"
        :diagram-ref="previewRef"
        :label-mode="diagram.label_display"
        reveal-hidden
        multiple
        :selectable-position-ids="allPositionIds"
        :selected-position-ids="answers && tool === 'correct' ? draft.correctPositionIds.value : []"
        :active-position-ids="playingPositionIds"
        @select="onPositionClick"
      />
      <DiagramPlayer
        v-if="instrument && previewRef && draft.canConfigurePlayback.value"
        class="mt-2"
        :diagram="diagram"
        :instrument="instrument"
        :playback="previewRef.playback ?? null"
        @active="playingPositionIds = $event"
      />
      <p v-else data-test="embed-picker-unavailable" class="text-sm text-ink-muted">
        {{ t('diagramEmbedPicker.unavailable') }}
      </p>
    </div>
  </div>
</template>
