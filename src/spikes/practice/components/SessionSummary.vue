<script setup lang="ts">
/** What changed in this session: per item before → after, and what comes up next. */
import { computed } from 'vue'

import LevelChip from '@/spikes/practice/components/LevelChip.vue'
import { exercises, itemByKey } from '@/spikes/practice/fixtures/catalog'
import { percent, seconds } from '@/spikes/practice/labels'
import type { Felt, KnowledgeState, Session } from '@/spikes/practice/model'
import { templateOf } from '@/spikes/practice/thresholds'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const props = defineProps<{
  session: Session
  touched: string[]
  before: Map<string, KnowledgeState>
}>()
const emit = defineEmits<{ close: [] }>()

const spike = usePracticeSpike()

const rows = computed(() =>
  props.touched.map((key) => ({
    item: itemByKey(key)!,
    before: props.before.get(key),
    after: spike.states.value.get(key),
  })),
)

const answers = computed(() =>
  spike.evidence.value.filter(
    (e) => e.session_id === props.session.session_id && e.source === 'auto_graded',
  ),
)
const right = computed(
  () => answers.value.filter((e) => e.source === 'auto_graded' && e.correct).length,
)

/** The timed drills practised in this session: one "how did it feel?" each. */
const timedTemplates = computed(() => {
  const out = new Set<string>()
  for (const e of answers.value) {
    const item = itemByKey(e.item_key)
    const template = item && e.source === 'auto_graded' ? templateOf(item, e.response) : null
    if (template) out.add(template)
  }
  return [...out]
})
function templateLabel(template: string): string {
  if (template === 'fretboard_cell:name_the_note') return 'Naming notes'
  if (template === 'fretboard_cell:find_the_note') return 'Finding notes'
  const id = template.replace(/^exercise:/, '')
  return exercises.find((x) => x.exercise_id === id)?.prompt ?? template
}
const FELT: { value: Felt; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'about_right', label: 'About right' },
  { value: 'hard', label: 'Hard' },
]
const feltOf = (template: string) =>
  spike.felt.value.find((f) => f.session_id === props.session.session_id && f.template === template)
    ?.felt

const levelUps = computed(
  () => rows.value.filter((r) => r.before && r.after && r.after.box > r.before.box).length,
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">Session done</h1>
    <div class="grid grid-cols-3 gap-2 text-center">
      <div class="rounded-lg bg-surface-raised p-3">
        <p class="text-2xl font-semibold">{{ touched.length }}</p>
        <p class="text-xs text-ink-muted">items practised</p>
      </div>
      <div v-if="answers.length" class="rounded-lg bg-surface-raised p-3">
        <p class="text-2xl font-semibold">{{ right }}/{{ answers.length }}</p>
        <p class="text-xs text-ink-muted">answers right</p>
      </div>
      <div class="rounded-lg bg-surface-raised p-3">
        <p class="text-2xl font-semibold">{{ levelUps }}</p>
        <p class="text-xs text-ink-muted">locked in for longer</p>
      </div>
    </div>

    <ul class="flex flex-col divide-y divide-border rounded-lg border border-border">
      <li v-for="r in rows" :key="r.item.item_key" class="flex flex-col gap-1 p-3 text-sm">
        <span class="font-semibold">{{ r.item.label }}</span>
        <span class="flex flex-wrap items-center gap-2">
          <LevelChip v-if="r.before" :level="r.before.effective_level" :fading="r.before.fading" />
          <span>→</span>
          <LevelChip
            v-if="r.after"
            :level="r.after.effective_level"
            :fading="r.after.fading"
            :verified="r.after.verified"
          />
        </span>
        <span v-if="r.after" class="text-xs text-ink-muted">
          <template v-if="r.item.kind === 'play_along'"
            >clean {{ r.before?.best_clean_bpm ?? '—' }} →
            {{ r.after.best_clean_bpm ?? '—' }} BPM</template
          >
          <template v-else-if="r.item.kind === 'chord_change'"
            >{{ r.after.best_changes_per_minute ?? '—' }} changes/min</template
          >
          <template v-else
            >speed {{ seconds(r.before?.median_latency_ms ?? null) }} →
            {{ seconds(r.after.median_latency_ms) }} · fluency
            {{ percent(r.after.fluency) }}</template
          >
          · next review {{ r.after.due_at ? new Date(r.after.due_at).toLocaleDateString() : '—' }}
        </span>
      </li>
    </ul>
    <section
      v-if="timedTemplates.length"
      class="flex flex-col gap-2 rounded-lg bg-surface-raised p-3"
    >
      <p class="text-sm font-semibold">How did it feel?</p>
      <div v-for="t in timedTemplates" :key="t" class="flex flex-wrap items-center gap-2 text-sm">
        <span class="w-32 shrink-0">{{ templateLabel(t) }}</span>
        <button
          v-for="f in FELT"
          :key="f.value"
          type="button"
          class="rounded-full border border-border px-3 py-1"
          :class="{ 'bg-accent text-accent-fg': feltOf(t) === f.value }"
          @click="spike.rateFelt(session.session_id, t, f.value)"
        >
          {{ f.label }}
        </button>
      </div>
    </section>
    <button type="button" class="rounded-lg bg-accent p-3 text-accent-fg" @click="emit('close')">
      Done
    </button>
  </div>
</template>
