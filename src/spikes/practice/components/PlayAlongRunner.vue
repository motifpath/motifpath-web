<script setup lang="ts">
/**
 * Play along with an animated diagram, guitar in hand. Each take is a count-in
 * then the drill's loops; when it ends the student rates it, and the tempo
 * ladder sets the next take's tempo.
 */
import { computed, ref, watch } from 'vue'

import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { useDiagramPlayback } from '@/shared/composables/useDiagramPlayback'
import RatingButtons from '@/spikes/practice/components/RatingButtons.vue'
import { diagrams, guitar, STUDENT_ID } from '@/spikes/practice/fixtures/catalog'
import type { PlayAlongItem, Rating } from '@/spikes/practice/model'
import { nextBpm, startingBpm } from '@/spikes/practice/tempoLadder'
import type { Take } from '@/spikes/practice/tempoLadder'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'
import { useTakeRecorder } from '@/spikes/practice/useTakeRecorder'

const props = defineProps<{ item: PlayAlongItem; sessionId: string; warmUp?: boolean }>()
const emit = defineEmits<{ done: [] }>()

const spike = usePracticeSpike()
const base = diagrams[props.item.diagram_id]!
const best = spike.states.value.get(props.item.item_key)?.best_clean_bpm ?? null
/** A warm-up plays comfortably below the best clean tempo; the ladder starts at it. */
const warmUpBpm = (b: number | null) =>
  b === null ? props.item.params.start_bpm : Math.max(props.item.params.start_bpm, Math.round((b * 0.8) / 5) * 5)
const bpm = ref(props.warmUp ? warmUpBpm(best) : startingBpm(props.item.params, best))
const takes = ref<Take[]>([])

/** The take as one sequence: rests for the count-in, then the drill looped. */
const takeDiagram = {
  ...base,
  sequence: [
    ...Array.from({ length: props.item.params.count_in_beats }, () => ({ position_ids: [], value: { num: 1, den: 4 }, strum: 'none' as const })),
    ...Array.from({ length: props.item.params.loops }, () => base.sequence).flat(),
  ],
}
const playback = { tempo_bpm: bpm.value, voice_id: null, direction: 'as_authored' as const, loop: false }
const player = useDiagramPlayback(() => ({ diagram: takeDiagram, instrument: guitar, playback }))

const phase = ref<'ready' | 'playing' | 'rating'>('ready')
const showGuide = ref(true)
const recordTake = ref(false)
const recorder = useTakeRecorder()
const message = ref<string | null>(null)

/** Count-in beats left, shown while the rests sound. */
const countIn = ref(0)
let countTimer: ReturnType<typeof setInterval> | undefined

async function startTake() {
  message.value = null
  player.tempo.value = bpm.value
  player.toggle()
  if (recordTake.value) await recorder.start()
  phase.value = 'playing'
}

watch(player.state, (s, prev) => {
  if (s === 'playing' && prev === 'loading') {
    countIn.value = props.item.params.count_in_beats
    clearInterval(countTimer)
    countTimer = setInterval(() => {
      countIn.value--
      if (countIn.value <= 0) clearInterval(countTimer)
    }, 60_000 / bpm.value)
  }
  if (s === 'idle' && phase.value === 'playing') void endTake()
  if (s === 'error') {
    message.value = "The sound didn't load — check your connection and try again."
    phase.value = 'ready'
  }
})

async function endTake() {
  player.stop()
  clearInterval(countTimer)
  countIn.value = 0
  phase.value = 'rating'
  const recorded = await recorder.stop()
  if (recorded) {
    spike.addTake({
      take_id: spike.newId('take'),
      student_id: STUDENT_ID,
      item_key: props.item.item_key,
      recorded_at: spike.clock(),
      bpm: bpm.value,
      duration_seconds: recorded.seconds,
      media_url: recorded.url,
      sent_for_review: false,
    })
  }
}

const ratedAt = ref(0)
watch(phase, (p) => {
  if (p === 'rating') ratedAt.value = performance.now()
})

function rate(rating: Rating) {
  spike.answer(
    props.item.item_key,
    { kind: 'self_rating', rating, bpm: bpm.value, changes_per_minute: null },
    props.sessionId,
  )
  takes.value.push({ bpm: bpm.value, rating })
  const next = nextBpm(props.item.params, takes.value, bpm.value)
  if (next > bpm.value) message.value = `Clean twice — up to ${next} BPM.`
  else if (next < bpm.value) message.value = `Let's settle it at ${next} BPM.`
  else if (rating === 'clean') message.value = `Once more clean at ${next} BPM and it goes up.`
  else message.value = `Again at ${next} BPM.`
  bpm.value = next
  phase.value = 'ready'
}

const active = computed(() => (showGuide.value ? player.activePositionIds.value : []))
const progressToTarget = computed(() => Math.min(1, bpm.value / props.item.params.target_bpm))
const diagramRef = { diagram_id: base.diagram_id, layers: { label: 'interval' as const } }
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-baseline justify-between gap-2">
      <p class="text-lg font-semibold">{{ item.label }}</p>
      <p class="text-2xl font-semibold tabular-nums">{{ bpm }} <span class="text-sm text-ink-muted">BPM</span></p>
    </div>
    <div class="h-1 overflow-hidden rounded-full bg-surface-sunken">
      <div class="h-1 bg-accent transition-all" :style="{ width: `${progressToTarget * 100}%` }" />
    </div>
    <p class="text-xs text-ink-muted">Goal {{ item.params.target_bpm }} BPM · best clean so far {{ best ?? '—' }}</p>

    <div class="relative overflow-x-auto rounded-lg bg-surface-raised p-3">
      <FrettedDiagramView
        :diagram="base"
        :instrument="guitar"
        :diagram-ref="diagramRef"
        :active-position-ids="active"
        :region-info="false"
      />
      <div
        v-if="phase === 'playing' && countIn > 0"
        class="absolute inset-0 flex items-center justify-center bg-surface/70 text-2xl font-semibold"
      >
        {{ countIn }}
      </div>
    </div>

    <template v-if="phase === 'ready'">
      <p v-if="message" class="text-sm">{{ message }}</p>
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <label class="flex items-center gap-2"><input v-model="showGuide" type="checkbox" /> Moving guide</label>
        <label class="flex items-center gap-2"><input v-model="recordTake" type="checkbox" /> Record this take</label>
      </div>
      <p v-if="recorder.error.value" class="text-sm text-danger">{{ recorder.error.value }}</p>
      <div class="flex gap-2">
        <button type="button" class="flex-1 rounded-lg bg-accent p-3 text-accent-fg" @click="startTake">
          {{ takes.length ? 'Next take' : 'Start take' }} · {{ item.params.loops }}× after a {{ item.params.count_in_beats }}-beat count-in
        </button>
        <button v-if="takes.length" type="button" class="rounded-lg border border-border p-3" @click="emit('done')">Done</button>
      </div>
    </template>

    <template v-else-if="phase === 'playing'">
      <p class="text-sm text-ink-muted">
        <span v-if="recorder.recording.value" class="text-danger">● Recording · </span>Play along — the take ends by itself.
      </p>
      <button type="button" class="rounded-lg border border-border p-3" @click="endTake">Stop early</button>
    </template>

    <template v-else>
      <p class="font-semibold">How was that take at {{ bpm }} BPM?</p>
      <RatingButtons @rate="rate" />
    </template>
  </div>
</template>
