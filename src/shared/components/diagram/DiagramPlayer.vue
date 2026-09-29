<script setup lang="ts">
/**
 * Play/Stop and a tempo slider for a diagram with a sequence. It reports the
 * positions being heard through `active`, for the diagram beside it to light
 * up. The tempo a student picks is never saved. It shows nothing when the
 * diagram has nothing to play, or its usage offers no Play control.
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import Icon from '@/shared/components/Icon.vue'
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

function onTempo(event: Event) {
  if (event.target instanceof HTMLInputElement) tempo.value = Number(event.target.value)
}

// The recordings are fetched once the player comes into view, so Play rarely waits on the network.
const root = ref<HTMLElement | null>(null)
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

onMounted(() => watch(root, watchVisibility, { immediate: true }))
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div v-if="canPlay" ref="root" data-test="diagram-player" class="flex flex-col gap-1">
    <div class="flex flex-wrap items-center gap-3">
      <button
        data-test="diagram-play"
        type="button"
        class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        :aria-label="state === 'playing' || state === 'loading' ? t('diagramPlayer.stop') : t('diagramPlayer.play')"
        :aria-busy="state === 'loading' ? 'true' : undefined"
        @click="toggle"
      >
        <Icon v-if="state === 'loading'" name="loading" class="animate-spin motion-reduce:animate-none" />
        <Icon v-else-if="state === 'playing'" name="stop" />
        <Icon v-else name="play" />
      </button>
      <label class="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-subtle">
        <span>{{ t('diagramPlayer.tempo') }}</span>
        <input
          data-test="diagram-tempo"
          type="range"
          :min="MIN_TEMPO_BPM"
          :max="MAX_TEMPO_BPM"
          step="1"
          :value="tempo"
          class="min-w-0 max-w-48 flex-1 accent-accent"
          @input="onTempo"
        />
        <span class="tabular-nums text-ink">{{ t('diagramPlayer.bpm', { bpm: tempo }) }}</span>
      </label>
    </div>
    <p v-if="state === 'error'" role="alert" class="text-xs text-danger">{{ t('diagramPlayer.loadFailed') }}</p>
  </div>
</template>
