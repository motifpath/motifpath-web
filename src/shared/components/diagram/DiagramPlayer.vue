<script lang="ts">
/** The player's width: Play and the tempo control side by side, for a rail to keep clear. */
export const PLAYER_WIDTH = 112
</script>

<script setup lang="ts">
/**
 * Compact Play/Stop and tempo controls for a diagram with a sequence, sized to sit in the
 * diagram's control rail. It reports the positions being heard through `active`, for the diagram
 * to light up. The tempo control shows the tempo and opens a panel on demand with a slider and a
 * numeric input; the tempo a student picks is never saved. When the sound can't load, Play
 * becomes Retry. It shows nothing when the diagram has nothing to play, or its usage offers no
 * Play control. A press on it never reaches whatever holds the diagram, such as an answer card.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { ChevronDown, LoaderCircle, Play, RotateCcw, Square, X } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MAX_TEMPO_BPM, MIN_TEMPO_BPM } from '@/shared/utils/sequence'

type Diagram = components['schemas']['Diagram']
type Instrument = components['schemas']['Instrument']
type Playback = NonNullable<components['schemas']['DiagramRef']['playback']>

const props = defineProps<{
  diagram: Diagram
  instrument: Instrument
  /** How this usage plays the diagram; null offers no Play control. */
  playback: Playback | null
}>()

const emit = defineEmits<{ active: [positionIds: string[]] }>()

const { t } = useTypedT()
const { canPlay, state, activePositionIds, tempo, toggle, prefetch } = useDiagramPlayback(() => ({
  diagram: props.diagram,
  instrument: props.instrument,
  playback: props.playback,
}))

watch(activePositionIds, (ids) => emit('active', ids))

const busy = computed(() => state.value === 'playing' || state.value === 'loading')
const actionLabel = computed(() => {
  if (busy.value) return t('diagramPlayer.stop')
  return state.value === 'error' ? t('diagramPlayer.retry') : t('diagramPlayer.play')
})

// The tempo panel: opened on demand, one per player.
const tempoOpen = ref(false)
const tempoInputId = `diagram-tempo-${useId()}`
const tempoControl = ref<HTMLButtonElement | null>(null)

/** Takes a whole number of BPM within the allowed range; anything else leaves the tempo as it is. */
function onTempo(event: Event) {
  if (!(event.target instanceof HTMLInputElement) || event.target.value.trim() === '') return
  const bpm = Number(event.target.value)
  if (Number.isInteger(bpm) && bpm >= MIN_TEMPO_BPM && bpm <= MAX_TEMPO_BPM) tempo.value = bpm
}

/** Leaving the numeric input shows the tempo in effect, whatever was typed. */
function onTempoBlur(event: Event) {
  if (event.target instanceof HTMLInputElement) event.target.value = String(tempo.value)
}

/** Closes the panel; from the keyboard or its close control, focus goes back to the tempo control. */
function closeTempo(returnFocus: boolean) {
  tempoOpen.value = false
  if (returnFocus) tempoControl.value?.focus()
}

const root = ref<HTMLElement | null>(null)

function onDocumentPointerDown(event: Event) {
  if (tempoOpen.value && event.target instanceof Node && !root.value?.contains(event.target)) closeTempo(false)
}

// The recordings are fetched once the player comes into view, so Play rarely waits on the network.
let observer: IntersectionObserver | null = null

function watchVisibility(element: HTMLElement | null) {
  observer?.disconnect()
  observer = null
  if (!element || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return
    observer?.disconnect()
    observer = null
    void prefetch()
  })
  observer.observe(element)
}

onMounted(() => {
  watch(root, watchVisibility, { immediate: true })
  document.addEventListener('pointerdown', onDocumentPointerDown)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <div v-if="canPlay" ref="root" data-test="diagram-player" class="relative inline-flex items-center" @click.stop>
    <button
      data-test="diagram-play"
      type="button"
      class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-accent hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
      :aria-label="actionLabel"
      :title="actionLabel"
      :aria-busy="state === 'loading' ? 'true' : undefined"
      @click="toggle"
    >
      <LoaderCircle v-if="state === 'loading'" :size="18" class="animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <Square v-else-if="state === 'playing'" :size="15" fill="currentColor" aria-hidden="true" />
      <RotateCcw v-else-if="state === 'error'" :size="18" aria-hidden="true" />
      <Play v-else :size="18" fill="currentColor" aria-hidden="true" />
    </button>
    <span data-test="diagram-player-status" role="status" class="sr-only">{{
      state === 'loading' ? t('diagramPlayer.loading') : ''
    }}</span>
    <button
      ref="tempoControl"
      data-test="diagram-tempo-toggle"
      type="button"
      class="inline-flex h-11 w-[68px] shrink-0 items-center justify-center gap-1 rounded-md text-accent hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus"
      :aria-label="t('diagramPlayer.tempoControl', { bpm: tempo })"
      :aria-expanded="tempoOpen"
      @click="tempoOpen = !tempoOpen"
      @keydown.escape="closeTempo(true)"
    >
      <span class="flex flex-col items-center leading-none">
        <strong class="text-sm font-semibold tabular-nums">{{ tempo }}</strong>
        <span class="mt-0.5 text-[0.625rem] text-ink-subtle">{{ t('diagramPlayer.bpm') }}</span>
      </span>
      <ChevronDown :size="12" :class="tempoOpen ? 'rotate-180' : ''" aria-hidden="true" />
    </button>

    <div
      v-if="tempoOpen"
      data-test="diagram-tempo-panel"
      class="absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface-raised p-3 shadow-level2"
      @keydown.escape="closeTempo(true)"
    >
      <div class="flex items-center justify-between gap-2">
        <label :for="tempoInputId" class="text-sm text-ink-muted">{{ t('diagramPlayer.tempo') }}</label>
        <button
          type="button"
          data-test="diagram-tempo-close"
          class="flex h-11 w-11 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          :aria-label="t('diagramPlayer.closeTempo')"
          @click="closeTempo(true)"
        >
          <X :size="16" aria-hidden="true" />
        </button>
      </div>
      <div class="flex items-center gap-3">
        <input
          data-test="diagram-tempo"
          type="range"
          :min="MIN_TEMPO_BPM"
          :max="MAX_TEMPO_BPM"
          step="1"
          :value="tempo"
          :aria-label="t('diagramPlayer.tempo')"
          class="h-11 min-w-0 flex-1 accent-accent"
          @input="onTempo"
        />
        <input
          :id="tempoInputId"
          data-test="diagram-tempo-number"
          type="number"
          inputmode="numeric"
          :min="MIN_TEMPO_BPM"
          :max="MAX_TEMPO_BPM"
          step="1"
          :value="tempo"
          class="h-11 w-20 rounded-md border border-border bg-surface px-2 text-sm tabular-nums text-ink"
          @input="onTempo"
          @blur="onTempoBlur"
        />
      </div>
      <p class="mt-1 text-xs text-ink-subtle">{{ t('diagramPlayer.tempoHint') }}</p>
    </div>

    <!-- Never in the way: the markers, regions and answers under it stay usable. -->
    <p
      v-if="state === 'error' && !tempoOpen"
      role="alert"
      class="pointer-events-none absolute left-0 top-full z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-danger shadow-level2"
    >
      {{ t('diagramPlayer.loadFailed') }}
    </p>
  </div>
</template>
