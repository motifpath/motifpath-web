<script setup lang="ts">
/**
 * Runs a composed session item by item. The header always says which block
 * this is and why this item was picked, and the plan can be opened.
 */
import { computed, ref } from 'vue'

import ChordChangeRunner from '@/spikes/practice/components/ChordChangeRunner.vue'
import ExerciseQuestion from '@/spikes/practice/components/ExerciseQuestion.vue'
import FretboardQuestion from '@/spikes/practice/components/FretboardQuestion.vue'
import PlayAlongRunner from '@/spikes/practice/components/PlayAlongRunner.vue'
import { itemByKey, STUDENT_ID } from '@/spikes/practice/fixtures/catalog'
import { BLOCK_LABEL, REASON_LABEL } from '@/spikes/practice/labels'
import type { BlockKind, Reason, Session } from '@/spikes/practice/model'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const props = defineProps<{ session: Session }>()
const emit = defineEmits<{ finished: [touched: string[]]; quit: [] }>()

const spike = usePracticeSpike()

const steps = computed(() =>
  props.session.blocks.flatMap((b) =>
    b.entries.map((e) => ({ block: b.kind as BlockKind, reason: e.reason as Reason, item: itemByKey(e.item_key)! })),
  ),
)
const index = ref(0)
const step = computed(() => steps.value[index.value])
const showPlan = ref(false)
const touched = new Set<string>()

function next() {
  if (step.value) touched.add(step.value.item.item_key)
  if (index.value + 1 >= steps.value.length) emit('finished', [...touched])
  else index.value++
}

function answered(correct: boolean, latencyMs: number) {
  const s = step.value
  if (!s) return
  spike.addEvidence({
    evidence_id: spike.newId('ev'),
    student_id: STUDENT_ID,
    item_key: s.item.item_key,
    occurred_at: spike.clock(),
    session_id: props.session.session_id,
    source: 'auto_graded',
    correct,
    latency_ms: latencyMs,
  })
  next()
}
</script>

<template>
  <div v-if="step" class="flex flex-col gap-4">
    <div class="flex items-center gap-3">
      <button type="button" class="text-sm text-ink-muted" @click="emit('quit')">‹ Leave</button>
      <div class="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken">
        <div class="h-1 bg-accent transition-all" :style="{ width: `${(index / steps.length) * 100}%` }" />
      </div>
      <button type="button" class="text-sm text-ink-muted" @click="showPlan = !showPlan">Plan</button>
    </div>

    <div class="flex flex-wrap items-center gap-2 text-xs">
      <span class="rounded-full bg-surface-sunken px-2 py-0.5">{{ BLOCK_LABEL[step.block] }}</span>
      <span v-if="step.reason !== 'warm_up' && step.reason !== 'application'" class="rounded-full bg-accent-muted px-2 py-0.5 text-accent-text">
        {{ REASON_LABEL[step.reason] }}
      </span>
    </div>

    <ol v-if="showPlan" class="rounded-lg border border-border p-3 text-sm">
      <li v-for="(s, i) in steps" :key="i" :class="{ 'font-semibold': i === index, 'text-ink-subtle': i < index }">
        {{ BLOCK_LABEL[s.block] }} · {{ s.item.label }} — <span class="text-ink-muted">{{ REASON_LABEL[s.reason] }}</span>
      </li>
    </ol>

    <FretboardQuestion
      v-if="step.item.kind === 'fretboard_cell'"
      :key="`${index}-${step.item.item_key}`"
      :item="step.item"
      :variant="index % 2 === 0 ? 'find' : 'name'"
      @answered="answered"
    />
    <ExerciseQuestion v-else-if="step.item.kind === 'exercise'" :key="`${index}-x`" :item="step.item" @answered="answered" />
    <PlayAlongRunner v-else-if="step.item.kind === 'play_along'" :key="`${index}-p`" :item="step.item" :session-id="session.session_id" :warm-up="step.block === 'warm_up'" @done="next" />
    <ChordChangeRunner v-else :key="`${index}-c`" :item="step.item" :session-id="session.session_id" @done="next" />
  </div>
  <div v-else class="flex flex-col gap-3">
    <p>Nothing to practise right now — everything you've met is fresh. Come back tomorrow, or pick up the next lesson on your path.</p>
    <button type="button" class="rounded-lg border border-border p-3" @click="emit('quit')">Back</button>
  </div>
</template>
