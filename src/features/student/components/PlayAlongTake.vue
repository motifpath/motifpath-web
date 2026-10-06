<script setup lang="ts">
/**
 * One take of a play-along item, instrument in hand: a bar of count-in, then the diagram's
 * sequence once at the take's tempo, its positions lighting up as they sound. When the take ends
 * by itself, or the student stops it, the student rates it, and the parent decides the next take's
 * tempo (the tempo ladder). A diagram that can't be played here can only be skipped.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Info, Metronome } from 'lucide-vue-next'

import type { components } from '@/api/generated/core-domain'
import { withCountIn } from '@/features/student/utils/countIn'
import { pickReasonKeys } from '@/features/student/utils/pickReason'
import { ladderFloor, TEMPO_STEP_BPM } from '@/features/student/utils/tempoLadder'
import type { TakeRating } from '@/features/student/utils/tempoLadder'
import PlayAlongInfo from '@/features/student/components/PlayAlongInfo.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import { useEmbeddedDiagram } from '@/shared/composables/useEmbeddedDiagram'
import { useTypedT } from '@/shared/composables/useTypedT'
import { MAX_TEMPO_BPM } from '@/shared/utils/sequence'

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

const emit = defineEmits<{ rate: [rating: TakeRating]; skip: []; tempo: [bpm: number] }>()

const { t } = useTypedT()

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

// Whether the next tempo change comes from the ladder, after a rating, rather than from the student.
let rated = false

function rate(rating: TakeRating) {
  phase.value = 'ready'
  rated = true
  emit('rate', rating)
}

function changeTempo(step: number) {
  chooseTempo(props.tempo + step)
}

function chooseTempo(bpm: number) {
  rated = false
  message.value = null
  sliding.value = null
  emit('tempo', bpm)
}

/** The slider's tempo while it's being dragged; the next take's is chosen once it's released. */
const sliding = ref<number | null>(null)
const shownTempo = computed(() => sliding.value ?? props.tempo)
const slowestTempo = computed(() => ladderFloor(playAlong.value.target_tempo_bpm))

function slide(event: Event) {
  if (event.target instanceof HTMLInputElement) sliding.value = Number(event.target.value)
}

function release(event: Event) {
  if (event.target instanceof HTMLInputElement) chooseTempo(Number(event.target.value))
}

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

const ratings = [
  {
    rating: 'struggled',
    label: 'playAlongTake.ratings.struggled',
    hint: 'playAlongTake.ratingHints.struggled',
    tone: 'bg-danger-muted',
  },
  { rating: 'almost', label: 'playAlongTake.ratings.almost', hint: 'playAlongTake.ratingHints.almost', tone: 'bg-warning-muted' },
  { rating: 'clean', label: 'playAlongTake.ratings.clean', hint: 'playAlongTake.ratingHints.clean', tone: 'bg-success-muted' },
] as const satisfies readonly { rating: TakeRating; label: string; hint: string; tone: string }[]

const infoOpen = ref(false)
const takesPlayed = computed(() => props.takesTotal - props.takesLeft)

const best = computed(() => playAlong.value.best_clean_tempo_bpm ?? t('playAlongTake.noBest'))
</script>

<template>
  <div class="flex flex-col gap-4" data-test="play-along-take">
    <StateLoading v-if="loaded.status.value === 'loading'" />

    <div v-else-if="loaded.status.value === 'unavailable'" class="flex flex-col items-start gap-3">
      <p class="text-ink-muted">{{ t('playAlongTake.unavailable') }}</p>
      <button type="button" data-test="skip-item" class="text-sm font-medium text-accent-text underline" @click="emit('skip')">
        {{ t('playAlongTake.skip') }}
      </button>
    </div>

    <template v-else-if="loaded.diagram.value && loaded.instrument.value && loaded.diagramRef.value">
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-1">
            <span class="truncate rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-medium">{{ t(pickReasonKeys[item.reason]) }}</span>
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
          <div class="flex shrink-0 items-center gap-1.5">
            <button
              v-if="phase === 'ready'"
              type="button"
              data-test="tempo-down"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-border text-sm tabular-nums"
              :aria-label="t('playAlongTake.slower', { step: TEMPO_STEP_BPM })"
              @click="changeTempo(-TEMPO_STEP_BPM)"
            >
              −{{ TEMPO_STEP_BPM }}
            </button>
            <span data-test="tempo-value" class="min-w-[4.5rem] text-center text-lg font-semibold tabular-nums">{{ t('playAlongTake.bpm', { bpm: shownTempo }) }}</span>
            <button
              v-if="phase === 'ready'"
              type="button"
              data-test="tempo-up"
              class="flex h-9 w-9 items-center justify-center rounded-md border border-border text-sm tabular-nums"
              :aria-label="t('playAlongTake.faster', { step: TEMPO_STEP_BPM })"
              @click="changeTempo(TEMPO_STEP_BPM)"
            >
              +{{ TEMPO_STEP_BPM }}
            </button>
          </div>
        </div>
        <input
          v-if="phase === 'ready'"
          type="range"
          data-test="tempo-slider"
          class="h-9 w-full cursor-pointer accent-accent"
          :min="slowestTempo"
          :max="MAX_TEMPO_BPM"
          :step="TEMPO_STEP_BPM"
          :value="shownTempo"
          :aria-label="t('playAlongTake.tempoSlider')"
          :aria-valuetext="t('playAlongTake.bpm', { bpm: shownTempo })"
          @input="slide"
          @change="release"
        />
        <p class="text-xs text-ink-muted">
          {{ warmUp ? t('playAlongTake.warmUpHint') : t('playAlongTake.goal', { target: playAlong.target_tempo_bpm, best }) }}
        </p>
      </div>
      <PlayAlongInfo v-if="infoOpen" :reason="item.reason" :diagram="loaded.diagram.value" @close="infoOpen = false" />

      <div ref="stage" data-test="take-stage" class="flex scroll-mt-20 flex-col gap-3">
        <div class="relative rounded-lg bg-surface-raised p-2">
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

        <template v-if="phase === 'ready'">
          <div class="flex items-center gap-3">
            <PrimaryButton data-test="start-take" data-primary-action @click="startTake">{{ t('playAlongTake.start') }}</PrimaryButton>
            <div
              data-test="take-dots"
              class="flex items-center gap-1.5"
              role="img"
              :aria-label="t('playAlongTake.takeOf', { current: Math.min(takesPlayed + 1, takesTotal), total: takesTotal })"
            >
              <span
                v-for="n in takesTotal"
                :key="n"
                data-test="take-dot"
                :data-played="n <= takesPlayed"
                class="h-2.5 w-2.5 rounded-full"
                :class="n <= takesPlayed ? 'bg-accent' : 'border border-border'"
              />
            </div>
            <button
              type="button"
              data-test="metronome"
              class="ml-auto flex h-10 w-10 items-center justify-center rounded-full border"
              :class="metronome ? 'border-accent bg-accent-muted text-accent-text' : 'border-border text-ink-muted'"
              :aria-pressed="metronome"
              :aria-label="t('playAlongTake.metronome')"
              :title="t('playAlongTake.metronome')"
              @click="metronome = !metronome"
            >
              <Metronome :size="20" aria-hidden="true" />
            </button>
          </div>
          <p v-if="loadError" class="text-sm text-danger" role="alert">{{ t('playAlongTake.loadError') }}</p>
          <p v-else-if="message" class="text-sm" aria-live="polite">{{ message }}</p>
          <p class="text-xs text-ink-muted">{{ t('playAlongTake.countInHint') }}</p>
        </template>

        <div v-else-if="phase === 'playing'" class="flex items-center gap-3">
          <button type="button" data-test="stop-early" class="rounded-lg border border-border px-4 py-2 text-sm" @click="stopEarly">
            {{ t('playAlongTake.stopEarly') }}
          </button>
          <p class="text-sm text-ink-muted">{{ t('playAlongTake.playing') }}</p>
        </div>

        <template v-else>
          <p class="font-semibold">{{ t('playAlongTake.ratePrompt', { bpm: tempo }) }}</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="option in ratings"
              :key="option.rating"
              type="button"
              :data-test="`rate-${option.rating}`"
              class="flex flex-col items-center rounded-lg p-3 text-ink"
              :class="option.tone"
              @click="rate(option.rating)"
            >
              <span class="text-base font-semibold">{{ t(option.label) }}</span>
              <span class="text-center text-xs text-ink-muted">{{ t(option.hint) }}</span>
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>
