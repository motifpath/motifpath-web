<script setup lang="ts">
/**
 * One take of a play-along item, instrument in hand: a bar of count-in, then the diagram's
 * sequence once at the take's tempo, its positions lighting up as they sound. When the take ends
 * by itself, or the student stops it, the student rates it in the action bar, and the parent
 * decides the next take's tempo (the tempo ladder). A diagram that can't be played here can only
 * be skipped, as not answered.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Info } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import type { NotAnsweredReason } from '@/features/student/composables/usePracticeSessionRun'
import { withCountIn } from '@/features/student/utils/countIn'
import { ladderFloor } from '@/features/student/utils/tempoLadder'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import ItemHeader from '@/features/student/components/ItemHeader.vue'
import PlayAlongInfo from '@/features/student/components/PlayAlongInfo.vue'
import SelfRating from '@/features/student/components/SelfRating.vue'
import TempoControl from '@/features/student/components/TempoControl.vue'
import AppButton from '@/shared/components/AppButton.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PracticeActionBar from '@/shared/components/PracticeActionBar.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Item = components['schemas']['PracticeSessionItem']
type PlayAlong = NonNullable<Item['play_along']>

const props = defineProps<{
  /** A play_along item. */
  item: Item
  /** The tempo the next take plays at. */
  tempo: number
  takesLeft: number
  /** The item's takes in all, played and still to play. */
  takesTotal: number
}>()

const emit = defineEmits<{ rate: [rating: TakeRating]; skip: [reason: NotAnsweredReason]; tempo: [bpm: number] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const playAlong = computed<PlayAlong>(() => props.item.play_along!)
const warmUp = computed(() => props.item.reason === 'warm_up')

const loaded = useEmbeddedDiagram(() => ({
  kind: 'single',
  ref: { diagram_id: playAlong.value.diagram_id, layers: { intervals: true } },
}))

const take = computed(() => (loaded.diagram.value ? withCountIn(loaded.diagram.value) : null))

/** Whether a take clicks the beat, the count-in included. */
const metronome = ref(true)

const player = useDiagramPlayback(
  () => ({
    // Until the diagram loads nothing is offered to play, so a placeholder source is never played.
    diagram: take.value?.diagram ?? loaded.diagram.value!,
    instrument: loaded.instrument.value!,
    playback: { tempo_bpm: props.tempo, voice_id: null, direction: 'as_authored', loop: false },
  }),
  { metronome: () => metronome.value },
)

const phase = ref<'ready' | 'playing' | 'rating'>('ready')
const loadError = ref(false)

/** Count-in beats still to come, shown while the count-in rests sound. */
const countIn = ref(0)
let countTimer: ReturnType<typeof setInterval> | undefined

function stopCounting() {
  clearInterval(countTimer)
  countIn.value = 0
}

/** The board with its take controls, brought into view as a take starts. */
const stage = ref<HTMLElement | null>(null)

function startTake() {
  loadError.value = false
  message.value = null
  phase.value = 'playing'
  // Inside the tap: iOS keeps audio started any later silent.
  player.toggle()
  // To its top, which keeps clear of the sticky app bar through its scroll margin.
  stage.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
}

watch(player.state, (state, previous) => {
  if (phase.value !== 'playing') return
  if (state === 'playing' && previous === 'loading') {
    countIn.value = take.value?.beats ?? 0
    clearInterval(countTimer)
    countTimer = setInterval(() => {
      countIn.value--
      if (countIn.value <= 0) stopCounting()
    }, 60_000 / props.tempo)
  } else if (state === 'error') {
    stopCounting()
    loadError.value = true
    phase.value = 'ready'
  } else if (state === 'idle' && previous === 'playing') {
    stopCounting()
    phase.value = 'rating'
  }
})

function stopEarly() {
  // Rating first, so the stop's own idle isn't read as the take ending.
  phase.value = 'rating'
  stopCounting()
  player.stop()
}

/** Drops the take without a rating, back to choosing its tempo, as when it started at the wrong one. */
function restartTake() {
  // Ready first, so the stop's own idle isn't read as the take ending.
  phase.value = 'ready'
  stopCounting()
  player.stop()
}

// Whether the next tempo change comes from the ladder, after a rating, rather than from the student.
let rated = false

function rate(rating: TakeRating) {
  phase.value = 'ready'
  rated = true
  emit('rate', rating)
}

function chooseTempo(bpm: number) {
  rated = false
  message.value = null
  emit('tempo', bpm)
}

const slowestTempo = computed(() => ladderFloor(playAlong.value.target_tempo_bpm))

/** What the ladder did with the last rating, said when the next take's tempo changes. */
const message = ref<string | null>(null)
watch(
  () => props.tempo,
  (next, previous) => {
    if (!rated) return
    rated = false
    if (next > previous) message.value = t('playAlongTake.up', { bpm: next })
    else if (next < previous) message.value = t('playAlongTake.down', { bpm: next })
  },
)
// A new item starts with nothing said about the previous one's ladder.
watch(
  () => props.item.item_key,
  () => {
    message.value = null
    phase.value = 'ready'
  },
)

onBeforeUnmount(stopCounting)

const infoOpen = ref(false)
const takesPlayed = computed(() => props.takesTotal - props.takesLeft)

/** "Take 1 of 3 · Goal 96 BPM · best clean 68"; a warm-up has no goal to say. */
const meta = computed(() => {
  const take = t('playAlongTake.takeOf', { current: Math.min(takesPlayed.value + 1, props.takesTotal), total: props.takesTotal })
  if (warmUp.value) return take
  const best = playAlong.value.best_clean_tempo_bpm ?? t('playAlongTake.noBest')
  return `${take} · ${t('playAlongTake.goal', { target: playAlong.value.target_tempo_bpm, best })}`
})
</script>

<template>
  <div class="flex flex-col gap-4" data-test="play-along-take">
    <LoadingSkeleton v-if="loaded.status.value === 'loading'" />

    <template v-else-if="loaded.status.value === 'unavailable'">
      <InlineNotice tone="unavailable" :message="t('playAlongTake.unavailable')" />
      <PracticeActionBar>
        <PrimaryButton data-test="skip-item" data-primary-action class="h-12 w-full" @click="emit('skip', 'unavailable')">
          {{ t('playAlongTake.skip') }}
        </PrimaryButton>
      </PracticeActionBar>
    </template>

    <template v-else-if="loaded.diagram.value && loaded.instrument.value && loaded.diagramRef.value">
      <ItemHeader :title="localizedName(loaded.diagram.value.names)" :reason="item.reason" />

      <div class="flex items-center gap-1">
        <p data-test="take-meta" class="text-sm text-ink-muted">{{ meta }}</p>
        <button
          type="button"
          data-test="item-info"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:text-ink"
          :aria-label="t('playAlongTake.info')"
          :aria-expanded="infoOpen"
          aria-controls="play-along-info"
          @click="infoOpen = !infoOpen"
        >
          <Info :size="18" aria-hidden="true" />
        </button>
      </div>
      <p v-if="warmUp" class="text-sm text-ink-muted">{{ t('playAlongTake.warmUpHint') }}</p>
      <PlayAlongInfo v-if="infoOpen" :reason="item.reason" :diagram="loaded.diagram.value" @close="infoOpen = false" />

      <div ref="stage" data-test="take-stage" class="flex scroll-mt-20 flex-col gap-4">
        <div class="relative rounded-lg border border-border bg-surface-raised p-2">
          <FrettedDiagramView
            :diagram="loaded.diagram.value"
            :instrument="loaded.instrument.value"
            :diagram-ref="loaded.diagramRef.value"
            :label-mode="loaded.labelMode.value"
            :active-position-ids="player.activePositionIds.value"
            :region-info="false"
          />
          <div
            v-if="phase === 'playing' && countIn > 0"
            data-test="count-in"
            class="absolute inset-0 flex items-center justify-center bg-surface/70 text-4xl font-semibold tabular-nums"
            aria-live="assertive"
          >
            {{ countIn }}
          </div>
        </div>

        <TempoControl
          :tempo="tempo"
          :slowest="slowestTempo"
          :goal="playAlong.target_tempo_bpm"
          :best="playAlong.best_clean_tempo_bpm ?? null"
          :metronome="metronome"
          :disabled="phase !== 'ready'"
          @update:metronome="metronome = $event"
          @tempo="chooseTempo"
        />
      </div>

      <template v-if="phase === 'ready'">
        <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
        <p v-else-if="message" class="text-sm" aria-live="polite">{{ message }}</p>
        <p class="text-xs text-ink-muted">{{ t('playAlongTake.countInHint') }}</p>
        <PracticeActionBar>
          <PrimaryButton data-test="start-take" data-primary-action class="h-12 w-full" @click="startTake">
            {{ t('playAlongTake.start') }}
          </PrimaryButton>
        </PracticeActionBar>
      </template>

      <template v-else-if="phase === 'playing'">
        <p class="text-sm text-ink-muted">{{ t('playAlongTake.playing') }}</p>
        <PracticeActionBar>
          <AppButton data-test="restart-take" variant="tertiary" class="h-12 px-4" @click="restartTake">
            {{ t('playAlongTake.restart') }}
          </AppButton>
          <AppButton data-test="stop-early" variant="secondary" class="h-12 flex-1" @click="stopEarly">
            {{ t('playAlongTake.stopEarly') }}
          </AppButton>
        </PracticeActionBar>
      </template>

      <SelfRating v-else :bpm="tempo" @rate="rate" @restart="restartTake" />
    </template>
  </div>
</template>
