<script setup lang="ts">
/**
 * Spike controls: which simulated student, which day it is, and an inspector
 * showing an item's raw evidence next to the state derived from it.
 */
import { computed, ref } from 'vue'

import LevelChip from '@/spikes/practice/components/LevelChip.vue'
import { items } from '@/spikes/practice/fixtures/catalog'
import { percent, seconds } from '@/spikes/practice/labels'
import { ARCHETYPES } from '@/spikes/practice/simulator'
import type { Archetype } from '@/spikes/practice/simulator'
import { SIM_DAYS, usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const spike = usePracticeSpike()
const inspected = ref(items.find((i) => i.kind === 'play_along')!.item_key)
const state = computed(() => spike.states.value.get(inspected.value))
const raw = computed(() => spike.evidence.value.filter((e) => e.item_key === inspected.value).slice(-15).reverse())
const archetypes = Object.entries(ARCHETYPES) as [Archetype, string][]
</script>

<template>
  <aside class="flex flex-col gap-3 rounded-xl border border-dashed border-border p-3 text-sm">
    <p class="font-semibold">Spike controls</p>
    <label class="flex flex-col gap-1">
      Simulated student
      <select v-model="spike.state.archetype" class="rounded-lg border border-border bg-surface p-2">
        <option v-for="[key, label] in archetypes" :key="key" :value="key">{{ label }}</option>
      </select>
    </label>
    <label class="flex flex-col gap-1">
      Today = day {{ spike.state.day }} ({{ spike.now.value.toISOString().slice(0, 10) }}) — history runs days 0–{{ SIM_DAYS - 1 }}
      <input v-model.number="spike.state.day" type="range" min="0" max="40" />
    </label>
    <p class="text-ink-muted">
      {{ spike.evidence.value.length }} evidence rows ({{ spike.state.live.evidence.length }} live) · {{ spike.notes.value.length }} notes ·
      {{ spike.state.takes.length }} takes
    </p>
    <button type="button" class="self-start rounded-lg border border-border px-3 py-1" @click="spike.resetLive()">Clear live data</button>

    <label class="flex flex-col gap-1">
      Inspect item
      <select v-model="inspected" class="rounded-lg border border-border bg-surface p-2">
        <option v-for="i in items" :key="i.item_key" :value="i.item_key">{{ i.label }}</option>
      </select>
    </label>
    <div v-if="state" class="flex flex-col gap-1">
      <LevelChip :level="state.effective_level" :fading="state.fading" :verified="state.verified" />
      <p class="text-xs text-ink-muted">
        earned {{ state.level }} · {{ state.attempts }} attempts · accuracy {{ percent(state.accuracy) }} · fluency {{ percent(state.fluency) }} ·
        box {{ state.box }} · due {{ state.due_at?.slice(0, 10) ?? '—' }} · median {{ seconds(state.median_latency_ms) }} ·
        best clean {{ state.best_clean_bpm ?? '—' }} BPM / {{ state.best_changes_per_minute ?? '—' }} cpm
      </p>
      <table class="text-xs">
        <tbody>
          <tr v-for="e in raw" :key="e.evidence_id">
            <td class="pr-2 text-ink-muted">{{ e.occurred_at.slice(5, 16).replace('T', ' ') }}</td>
            <td class="pr-2">{{ e.source }}</td>
            <td>
              <template v-if="e.source === 'auto_graded'">{{ e.correct ? '✓' : '✗' }} {{ seconds(e.latency_ms) }}</template>
              <template v-else>{{ e.rating }} {{ e.bpm ?? '' }}{{ e.changes_per_minute ?? '' }}<template v-if="e.source === 'teacher_reviewed'"> {{ e.verified ? '✓v' : '' }}</template></template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </aside>
</template>
