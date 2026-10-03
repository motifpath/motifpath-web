<script setup lang="ts">
/**
 * Gaps and progress, all derived from evidence: the fretboard as a mastery
 * heatmap, answer speed per string now vs two weeks ago, the skill tree with
 * its rollups, and the technique items' tempo history.
 */
import { computed, ref } from 'vue'

import LevelChip from '@/spikes/practice/components/LevelChip.vue'
import { cellItems, items } from '@/spikes/practice/fixtures/catalog'
import { graph } from '@/spikes/practice/fixtures/graph'
import { LEVEL_CLASS, LEVEL_LABEL, percent, seconds } from '@/spikes/practice/labels'
import type { KnowledgeState, Level } from '@/spikes/practice/model'
import { rollup } from '@/spikes/practice/graph'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const spike = usePracticeSpike()
const showNames = ref(false)
const DAY_MS = 86_400_000

const strings = [1, 2, 3, 4, 5, 6]
const frets = Array.from({ length: 12 }, (_, f) => f)
const cellAt = (s: number, f: number) => cellItems.find((c) => c.string === s && c.fret === f)!
const stateOf = (key: string) => spike.states.value.get(key)

const twoWeeksAgo = computed(() => spike.statesAt(new Date(spike.now.value.getTime() - 14 * DAY_MS)))

function stringSpeed(states: Map<string, KnowledgeState>, s: number): number | null {
  const ms = cellItems
    .filter((c) => c.string === s)
    .map((c) => states.get(c.item_key)?.median_latency_ms ?? null)
    .filter((v): v is number => v !== null)
  return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null
}

/** The skill tree flattened with depth, for an indented list. */
const tree = computed(() => {
  const out: { id: string; name: string; depth: number }[] = []
  const walk = (parent: string | null, depth: number) => {
    for (const n of graph.nodes.filter((s) => s.parent_id === parent)) {
      out.push({ id: n.node_id, name: n.name, depth })
      walk(n.node_id, depth + 1)
    }
  }
  walk(null, 0)
  return out
})

const rollups = computed(() => new Map(tree.value.map((n) => [n.id, rollup(graph.nodes, items, spike.states.value, n.id)])))

const LEVELS: Level[] = ['retained', 'fluent', 'accurate', 'learning', 'new']

const technique = computed(() =>
  items
    .filter((i) => i.kind === 'play_along' || i.kind === 'chord_change')
    .map((item) => {
      const history = spike.evidence.value
        .filter((e) => e.item_key === item.item_key && e.source !== 'auto_graded' && e.rating === 'clean')
        .map((e) => ({
          day: e.occurred_at.slice(5, 10),
          value: e.source === 'auto_graded' ? 0 : ((item.kind === 'play_along' ? e.bpm : e.changes_per_minute) ?? 0),
          teacher: e.source === 'teacher_reviewed',
        }))
      const byDay = new Map<string, number>()
      for (const h of history) byDay.set(h.day, Math.max(byDay.get(h.day) ?? 0, h.value))
      const goal = item.kind === 'play_along' ? item.params.target_bpm : item.target_changes_per_minute
      return { item, state: stateOf(item.item_key), days: [...byDay.entries()], goal }
    }),
)
</script>

<template>
  <div class="flex flex-col gap-6">
    <section class="flex flex-col gap-2">
      <div class="flex items-baseline justify-between">
        <h2 class="text-lg font-semibold">Your fretboard</h2>
        <label class="flex items-center gap-1 text-sm"><input v-model="showNames" type="checkbox" /> note names</label>
      </div>
      <div class="overflow-x-auto">
        <table class="border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <th />
              <th v-for="f in frets" :key="f" class="w-9 font-normal text-ink-muted">{{ f }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in strings" :key="s">
              <th class="pr-1 font-normal text-ink-muted">{{ s }}</th>
              <td
                v-for="f in frets"
                :key="f"
                class="h-6 w-9 rounded-sm text-center"
                :class="[
                  LEVEL_CLASS[stateOf(cellAt(s, f).item_key)?.effective_level ?? 'new'],
                  stateOf(cellAt(s, f).item_key)?.fading ? 'outline-dashed outline-2 outline-warning' : '',
                ]"
                :title="`${cellAt(s, f).note_name} · ${LEVEL_LABEL[stateOf(cellAt(s, f).item_key)?.effective_level ?? 'new']} · ${seconds(stateOf(cellAt(s, f).item_key)?.median_latency_ms ?? null)}`"
              >
                {{ showNames ? cellAt(s, f).note_name : '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex flex-wrap gap-2">
        <LevelChip v-for="l in LEVELS" :key="l" :level="l" />
        <span class="rounded-full border border-dashed border-warning px-2 py-0.5 text-xs">fading</span>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Speed — how fast you find notes</h2>
      <ul class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <li v-for="s in strings" :key="s" class="rounded-lg bg-surface-raised p-2">
          <span class="text-ink-muted">String {{ s }}</span><br />
          <template v-if="stringSpeed(spike.states.value, s) !== null">
            <span class="text-ink-subtle">{{ seconds(stringSpeed(twoWeeksAgo, s)) }} →</span>
            <span class="font-semibold">{{ seconds(stringSpeed(spike.states.value, s)) }}</span>
          </template>
          <span v-else class="text-ink-subtle">not practised yet</span>
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Technique</h2>
      <div v-for="t in technique" :key="t.item.item_key" class="flex flex-col gap-1 rounded-lg bg-surface-raised p-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-semibold">{{ t.item.label }}</span>
          <LevelChip v-if="t.state" :level="t.state.effective_level" :fading="t.state.fading" :verified="t.state.verified" />
        </div>
        <div class="flex h-16 items-end gap-0.5">
          <div
            v-for="[day, v] in t.days"
            :key="day"
            class="flex-1 rounded-t-sm bg-accent"
            :style="{ height: `${Math.min(100, (v / t.goal) * 100)}%` }"
            :title="`${day}: ${v}`"
          />
        </div>
        <p class="text-xs text-ink-muted">
          best clean {{ t.item.kind === 'play_along' ? `${t.state?.best_clean_bpm ?? '—'} BPM` : `${t.state?.best_changes_per_minute ?? '—'} changes/min` }} · goal {{ t.goal }}
        </p>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Skill map</h2>
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="n in tree" :key="n.id" class="flex items-center gap-2" :class="['pl-0', 'pl-4', 'pl-8', 'pl-12'][n.depth]">
          <span class="w-44 shrink-0">{{ n.name }}</span>
          <template v-if="rollups.get(n.id)">
            <span v-if="rollups.get(n.id)!.total" class="flex h-3 flex-1 overflow-hidden rounded-full bg-surface-sunken">
              <span
                v-for="l in LEVELS"
                :key="l"
                :class="LEVEL_CLASS[l]"
                :style="{ width: `${(rollups.get(n.id)!.by_level[l] / rollups.get(n.id)!.total) * 100}%` }"
              />
            </span>
            <span v-if="rollups.get(n.id)!.total" class="w-36 text-right text-xs text-ink-muted">
              {{ rollups.get(n.id)!.total - rollups.get(n.id)!.by_level.new }}/{{ rollups.get(n.id)!.total }} met ·
              {{ percent(rollups.get(n.id)!.mean_fluency) }}<template v-if="rollups.get(n.id)!.fading"> · {{ rollups.get(n.id)!.fading }} fading</template>
            </span>
            <span v-else class="text-xs text-ink-subtle">no items yet</span>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>
