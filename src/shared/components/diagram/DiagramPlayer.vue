<script lang="ts">
/** The player's width: Play and the tempo control side by side, for a rail to keep clear. */
export const PLAYER_WIDTH = 88
</script>

<script setup lang="ts">
/**
 * Compact Play/Stop and tempo controls for a diagram with a sequence, sized to sit in the
 * diagram's control rail. It reports the positions being heard through `active`, for the diagram
 * to light up. Both controls look like the rail's region information controls. The tempo control, a
 * metronome named with the tempo, opens a panel on demand with a slider and a numeric input; the
 * tempo a student picks is never saved. When the sound can't load, Play
 * becomes Retry. The tempo panel and the load error are drawn over the page, anchored to their
 * control, so a card that clips its content never cuts them off. It shows nothing when the diagram
 * has nothing to play, or its usage offers no Play control. A press on it never reaches whatever holds the diagram, such as an answer card.
 */
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { LoaderCircle, Metronome, Play, RotateCcw, Square, X } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { useAnchoredPopover } from '@/shared/composables/useAnchoredPopover'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { RAIL_CONTROL_CLASS, RAIL_ICON_SIZE } from '@/shared/utils/regionInfoLayout'
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
const tempoLabel = computed(() => t('diagramPlayer.tempoControl', { bpm: tempo.value }))
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
const playControl = ref<HTMLButtonElement | null>(null)
const tempoPanel = ref<HTMLElement | null>(null)
const errorMessage = ref<HTMLElement | null>(null)

const { style: tempoPanelStyle } = useAnchoredPopover(tempoControl, tempoPanel, tempoOpen)
const errorShown = computed(() => state.value === 'error' && !tempoOpen.value)
const { style: errorStyle } = useAnchoredPopover(playControl, errorMessage, errorShown)

/** A press anywhere but the player and its panel closes the panel, without taking focus. */
function onDocumentPointerDown(event: Event) {
  if (!tempoOpen.value || !(event.target instanceof Node)) return
  if (root.value?.contains(event.target) || tempoPanel.value?.contains(event.target)) return
  closeTempo(false)
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
  <div v-if="canPlay" ref="root" data-test="diagram-player" class="relative flex" @click.stop>
    <button
      ref="playControl"
      data-test="diagram-play"
      type="button"
      :class="[RAIL_CONTROL_CLASS, 'text-accent']"
      :aria-label="actionLabel"
      :title="actionLabel"
      :aria-busy="state === 'loading' ? 'true' : undefined"
      @click="toggle"
    >
      <LoaderCircle
        v-if="state === 'loading'"
        :size="RAIL_ICON_SIZE"
        class="animate-spin motion-reduce:animate-none"
        aria-hidden="true"
      />
      <Square v-else-if="state === 'playing'" :size="RAIL_ICON_SIZE" fill="currentColor" aria-hidden="true" />
      <RotateCcw v-else-if="state === 'error'" :size="RAIL_ICON_SIZE" aria-hidden="true" />
      <Play v-else :size="RAIL_ICON_SIZE" fill="currentColor" aria-hidden="true" />
    </button>
    <span data-test="diagram-player-status" role="status" class="sr-only">{{
      state === 'loading' ? t('diagramPlayer.loading') : ''
    }}</span>
    <button
      ref="tempoControl"
      data-test="diagram-tempo-toggle"
      type="button"
      :class="[RAIL_CONTROL_CLASS, 'text-accent']"
      :aria-label="tempoLabel"
      :title="tempoLabel"
      :aria-expanded="tempoOpen"
      @click="tempoOpen = !tempoOpen"
      @keydown.escape="closeTempo(true)"
    >
      <Metronome :size="RAIL_ICON_SIZE" aria-hidden="true" />
    </button>

    <Teleport to="body">
    <div
      v-if="tempoOpen"
      ref="tempoPanel"
      data-test="diagram-tempo-panel"
      class="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-surface-raised p-3 shadow-level2"
      :style="tempoPanelStyle"
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
      v-if="errorShown"
      ref="errorMessage"
      role="alert"
      class="pointer-events-none fixed z-50 w-64 max-w-[calc(100vw-1rem)] rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-danger shadow-level2"
      :style="errorStyle"
    >
      {{ t('diagramPlayer.loadFailed') }}
    </p>
    </Teleport>
  </div>
</template>
