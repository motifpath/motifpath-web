<script setup lang="ts">
/**
 * Throwaway phone prototype for the open commit-point cases: pick a case and a variant, run a
 * short block of items, rate how it felt. Every block's trials go to the dev server, so the
 * comparison rests on what happened, not on memory.
 */
import { computed, ref } from 'vue'

import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import ChoiceTrial from '@/spikes/commit-point/ChoiceTrial.vue'
import FretboardTrial from '@/spikes/commit-point/FretboardTrial.vue'
import { findTheNoteCells, P1_ITEMS, P2_ITEMS } from '@/spikes/commit-point/items'
import ListeningTrial from '@/spikes/commit-point/ListeningTrial.vue'
import { summarize } from '@/spikes/commit-point/trialLog'
import type { Trial } from '@/spikes/commit-point/trialLog'
import { VARIANT_LABELS } from '@/spikes/commit-point/variants'
import type { CaseId, Variant } from '@/spikes/commit-point/variants'

interface Rating {
  caseId: CaseId
  variant: Variant
  score: number
  note: string
}

const STORAGE_KEY = 'commit-point-spike'
const CASES: { id: CaseId; title: string }[] = [
  { id: 'P1', title: 'Listening: moving on after a right answer' },
  { id: 'P2', title: 'Choose several: Check or the count' },
  { id: 'P3', title: 'Find the note on the board' },
]
const VARIANTS: Variant[] = ['A', 'B', 'C']
const P3_BLOCK = 12

function load(): { trials: Trial[]; ratings: Rating[] } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // A private window or blocked storage starts empty.
  }
  return { trials: [], ratings: [] }
}

const saved = load()
const trials = ref<Trial[]>(saved.trials)
const ratings = ref<Rating[]>(saved.ratings)
const metadataProbes = ref<{ loaded: boolean; ms: number | null }[]>([])
const sendState = ref<'idle' | 'sent' | 'failed'>('idle')

const screen = ref<'menu' | 'run' | 'rate' | 'results'>('menu')
const caseId = ref<CaseId>('P1')
const variant = ref<Variant>('A')
const step = ref(0)
const cells = ref(findTheNoteCells(P3_BLOCK))
const score = ref(0)
const note = ref('')

const blockLength = computed(() => (caseId.value === 'P1' ? P1_ITEMS.length : caseId.value === 'P2' ? P2_ITEMS.length : P3_BLOCK))
const summary = computed(() => summarize(trials.value))
const done = (id: CaseId, v: Variant) => ratings.value.some((rating) => rating.caseId === id && rating.variant === v)

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ trials: trials.value, ratings: ratings.value }))
  } catch {
    // Results still reach the dev server.
  }
}

async function send() {
  try {
    const response = await fetch('/__spike/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device: { userAgent: navigator.userAgent, width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio },
        metadataProbes: metadataProbes.value,
        trials: trials.value,
        ratings: ratings.value,
        summary: summary.value,
      }),
    })
    sendState.value = response.ok ? 'sent' : 'failed'
  } catch {
    sendState.value = 'failed'
  }
}

function start(id: CaseId, v: Variant) {
  caseId.value = id
  variant.value = v
  step.value = 0
  cells.value = findTheNoteCells(P3_BLOCK)
  screen.value = 'run'
  window.scrollTo(0, 0)
}

function record(trial: Trial) {
  trials.value = [...trials.value, trial]
  persist()
  if (step.value + 1 < blockLength.value) step.value++
  else {
    score.value = 0
    note.value = ''
    screen.value = 'rate'
  }
}

function rate() {
  ratings.value = [...ratings.value, { caseId: caseId.value, variant: variant.value, score: score.value, note: note.value.trim() }]
  persist()
  void send()
  screen.value = 'menu'
}

function clearAll() {
  trials.value = []
  ratings.value = []
  persist()
}

const percent = (share: number) => `${Math.round(share * 100)}%`
</script>

<template>
  <div class="min-h-dvh bg-surface text-ink">
    <main class="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-4 pb-32 pt-6">
      <template v-if="screen === 'menu'">
        <header class="flex flex-col gap-1">
          <h1 class="text-lg font-semibold">Commit-point prototypes</h1>
          <p class="text-sm text-ink-muted">Try every variant of a case, guitar in hand where it fits. A is how the session works today.</p>
        </header>
        <section v-for="entry in CASES" :key="entry.id" class="flex flex-col gap-2 rounded-lg border border-border p-4">
          <h2 class="font-semibold">{{ entry.id }} · {{ entry.title }}</h2>
          <button
            v-for="v in VARIANTS"
            :key="v"
            type="button"
            class="flex min-h-12 items-center justify-between gap-3 rounded-md border px-3 text-left"
            :class="done(entry.id, v) ? 'border-success bg-success-muted' : 'border-border'"
            @click="start(entry.id, v)"
          >
            <span><strong>{{ v }}</strong> · {{ VARIANT_LABELS[entry.id][v] }}</span>
            <span v-if="done(entry.id, v)" class="text-sm text-success">done</span>
          </button>
        </section>
        <PrimaryButton class="h-12" @click="screen = 'results'">Results</PrimaryButton>
      </template>

      <template v-else-if="screen === 'run'">
        <p class="text-sm text-ink-muted">{{ caseId }} · {{ variant }} — {{ step + 1 }} of {{ blockLength }}</p>
        <ListeningTrial
          v-if="caseId === 'P1'"
          :key="`P1-${step}`"
          :item="P1_ITEMS[step]!"
          :variant="variant"
          @done="record"
          @metadata="(loaded, ms) => metadataProbes.push({ loaded, ms })"
        />
        <ChoiceTrial v-else-if="caseId === 'P2'" :key="`P2-${step}`" :item="P2_ITEMS[step]!" :variant="variant" @done="record" />
        <FretboardTrial v-else :key="`P3-${step}`" :cell="cells[step]!" :index="step" :variant="variant" @done="record" />
      </template>

      <template v-else-if="screen === 'rate'">
        <h1 class="text-lg font-semibold">{{ caseId }} · {{ variant }}: how did that feel?</h1>
        <div class="grid grid-cols-5 gap-2">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            class="h-12 rounded-md border font-semibold"
            :class="score === value ? 'border-accent bg-accent-muted' : 'border-border'"
            @click="score = value"
          >
            {{ value }}
          </button>
        </div>
        <p class="text-sm text-ink-muted">1 = got in my way · 5 = didn't notice it</p>
        <textarea v-model="note" rows="3" class="rounded-md border border-border bg-surface p-3" placeholder="Anything you noticed (optional)" />
        <PrimaryButton class="h-12" :disabled="score === 0" @click="rate">Save</PrimaryButton>
      </template>

      <template v-else>
        <h1 class="text-lg font-semibold">Results</h1>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-ink-muted">
              <th>Case</th>
              <th>n</th>
              <th>Right</th>
              <th>Median</th>
              <th>Off by 1</th>
              <th>Replays</th>
              <th>Cut off</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summary" :key="`${row.caseId}${row.variant}`">
              <td>{{ row.caseId }}{{ row.variant }}</td>
              <td>{{ row.trials }}</td>
              <td>{{ percent(row.rightShare) }}</td>
              <td>{{ (row.medianAnswerMs / 1000).toFixed(1) }} s</td>
              <td>{{ percent(row.misTapShare) }}</td>
              <td>{{ row.replaysDuringFeedback }}</td>
              <td>{{ row.cutOffs }}</td>
            </tr>
          </tbody>
        </table>
        <p class="text-sm text-ink-muted">
          Clip length readable before playing:
          {{ metadataProbes.length === 0 ? 'not checked yet (run P1)' : `${metadataProbes.filter((probe) => probe.loaded).length} of ${metadataProbes.length}` }}
        </p>
        <PrimaryButton class="h-12" @click="send">Send to the dev machine</PrimaryButton>
        <p v-if="sendState !== 'idle'" class="text-sm" :class="sendState === 'sent' ? 'text-success' : 'text-danger'">
          {{ sendState === 'sent' ? 'Sent.' : 'Could not send — is the spike server running?' }}
        </p>
        <button type="button" class="min-h-12 text-sm text-ink-muted underline" @click="screen = 'menu'">Back</button>
        <button type="button" class="min-h-12 text-sm text-danger underline" @click="clearAll">Clear all results</button>
      </template>
    </main>
  </div>
</template>
