<script lang="ts">
/** The player's width: Play and the tempo control side by side, for a rail to keep clear. */
export const PLAYER_WIDTH = 88
</script>

<script setup lang="ts">
/**
 * Compact Play/Stop and tempo controls for a diagram with a playback, sized to sit in the
 * diagram's control rail. It reports the positions being heard through `active`, for the diagram
 * to light up. Both controls look like the rail's region information controls; the tempo is never
 * saved. When the sound can't load, Play becomes Retry. The load error is drawn over the page,
 * anchored to Play, so a card that clips its content never cuts it off. It shows nothing when the
 * diagram has nothing to play, or its usage offers no Play control. A press on it never reaches
 * whatever holds the diagram, such as an answer card.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LoaderCircle, Play, RotateCcw, Square } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import DiagramTempo from '@/shared/components/diagram/DiagramTempo.vue'
import { useAnchoredPopover } from '@/shared/composables/useAnchoredPopover'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useTypedT } from '@/shared/composables/useTypedT'
import { RAIL_CONTROL_CLASS, RAIL_ICON_SIZE } from '@/shared/utils/regionInfoLayout'
import type { TempoNoteValue } from '@/shared/utils/tempoNoteValue'

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
/** The note value the student plays the diagram at for this showing; never saved. */
const noteValue = ref<TempoNoteValue>('quarters')
const { canPlay, state, activePositionIds, tempo, toggle, prefetch } = useDiagramPlayback(
  () => ({
    diagram: props.diagram,
    instrument: props.instrument,
    playback: props.playback,
  }),
  { noteValue: () => noteValue.value },
)

watch(activePositionIds, (ids) => emit('active', ids))

const busy = computed(() => state.value === 'playing' || state.value === 'loading')
const actionLabel = computed(() => {
  if (busy.value) return t('diagramPlayer.stop')
  return state.value === 'error' ? t('diagramPlayer.retry') : t('diagramPlayer.play')
})

const root = ref<HTMLElement | null>(null)
const playControl = ref<HTMLButtonElement | null>(null)
const errorMessage = ref<HTMLElement | null>(null)

const tempoOpen = ref(false)
const errorShown = computed(() => state.value === 'error' && !tempoOpen.value)
const { style: errorStyle } = useAnchoredPopover(playControl, errorMessage, errorShown)

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

onMounted(() => watch(root, watchVisibility, { immediate: true }))
onBeforeUnmount(() => observer?.disconnect())
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
    <DiagramTempo v-model="tempo" v-model:open="tempoOpen" v-model:note-value="noteValue" />

    <Teleport to="body">
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
