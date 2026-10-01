<script setup lang="ts">
/** What changed in this session: per item before → after, and what comes up next. */
import { computed } from 'vue'

import LevelChip from '@/spikes/practice/components/LevelChip.vue'
import { itemByKey } from '@/spikes/practice/fixtures/catalog'
import { percent, seconds } from '@/spikes/practice/labels'
import type { KnowledgeState, Session } from '@/spikes/practice/model'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const props = defineProps<{ session: Session; touched: string[]; before: Map<string, KnowledgeState> }>()
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
  spike.evidence.value.filter((e) => e.session_id === props.session.session_id && e.source === 'auto_graded'),
)
const right = computed(() => answers.value.filter((e) => e.source === 'auto_graded' && e.correct).length)

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
          <LevelChip v-if="r.after" :level="r.after.effective_level" :fading="r.after.fading" :verified="r.after.verified" />
        </span>
        <span v-if="r.after" class="text-xs text-ink-muted">
          <template v-if="r.item.kind === 'play_along'">clean {{ r.before?.best_clean_bpm ?? '—' }} → {{ r.after.best_clean_bpm ?? '—' }} BPM</template>
          <template v-else-if="r.item.kind === 'chord_change'">{{ r.after.best_changes_per_minute ?? '—' }} changes/min</template>
          <template v-else>speed {{ seconds(r.before?.median_latency_ms ?? null) }} → {{ seconds(r.after.median_latency_ms) }} · fluency {{ percent(r.after.fluency) }}</template>
          · next review {{ r.after.due_at ? new Date(r.after.due_at).toLocaleDateString() : '—' }}
        </span>
      </li>
    </ul>
    <button type="button" class="rounded-lg bg-accent p-3 text-accent-fg" @click="emit('close')">Done</button>
  </div>
</template>
