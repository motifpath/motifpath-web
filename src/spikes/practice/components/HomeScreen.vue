<script setup lang="ts">
/**
 * The call to practise (two taps to the first item), then the student's
 * progress organised by skills and concepts: what improved this week first,
 * then next steps. Gaps are framed as things to do, never as failures.
 */
import { computed, ref } from 'vue'

import LevelChip from '@/spikes/practice/components/LevelChip.vue'
import TapCheck from '@/spikes/practice/components/TapCheck.vue'
import { instruments, itemByKey } from '@/spikes/practice/fixtures/catalog'
import { nodeName } from '@/spikes/practice/fixtures/graph'
import { LEVEL_LABEL, percent } from '@/spikes/practice/labels'
import type { NodeProgress, Opportunity } from '@/spikes/practice/summary'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const emit = defineEmits<{ start: [instrumentInHand: string | null, minutes: number] }>()
const spike = usePracticeSpike()

/** The instrument picked for this session: an id, null for "in my head", undefined until picked. */
const instrument = ref<string | null | undefined>(undefined)
const mine = computed(() =>
  spike.instrumentIds.value.map((id) => ({ id, name: instruments[id]?.names.en ?? id })),
)
/** Whose skills the page shows; defaults to the first instrument. */
const shown = ref<string | null>(null)
const shownId = computed(() => shown.value ?? spike.instrumentIds.value[0]!)
const tapping = ref(false)
const summary = computed(() => spike.summaryFor(shownId.value))
const latestNote = computed(() => spike.activeNotes.value[0])
const latestOpen = computed(() => (latestNote.value ? spike.openFor(latestNote.value) : null))

/** "accuracy 72% → 86%" style changes: only what moved, always both values. */
function changes(p: NodeProgress): string[] {
  const out: string[] = []
  if (p.from.level !== p.to.level && p.to.level)
    out.push(`${LEVEL_LABEL[p.from.level ?? 'new']} → ${LEVEL_LABEL[p.to.level]}`)
  if (p.to.met > p.from.met) out.push(`${p.from.met} → ${p.to.met} of ${p.to.total} started`)
  const moved = (a: number | null, b: number | null) => a !== null && b !== null && b - a >= 0.02
  if (moved(p.from.accuracy, p.to.accuracy))
    out.push(`accuracy ${percent(p.from.accuracy!)} → ${percent(p.to.accuracy!)}`)
  if (moved(p.from.fluency, p.to.fluency))
    out.push(`speed ${percent(p.from.fluency!)} → ${percent(p.to.fluency!)}`)
  return out
}

function opportunityText(o: Opportunity): string {
  switch (o.kind) {
    case 'refresh':
      return `Refresh ${o.count} in ${nodeName(o.node_id)} — a few minutes brings ${o.count === 1 ? 'it' : 'them'} back`
    case 'strengthen':
      return `Strengthen ${o.count} in ${nodeName(o.node_id)}`
    case 'start':
      return `Ready to start: ${nodeName(o.node_id)}`
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-level1">
      <h1 class="text-xl font-semibold">Daily practice</h1>

      <div v-if="latestNote && latestOpen" class="rounded-lg bg-accent-muted p-3 text-sm">
        <p class="font-semibold text-accent-text">From your teacher</p>
        <p>{{ latestNote.summary }}</p>
        <p class="mt-1 text-xs text-ink-muted">
          Working on:
          {{
            [
              ...latestOpen.node_ids.map(nodeName),
              ...latestOpen.item_keys.map((k) => itemByKey(k)?.label ?? k),
            ].join(', ')
          }}
          — until {{ LEVEL_LABEL[latestNote.target_level].toLowerCase() }}
        </p>
      </div>

      <template v-if="instrument === undefined">
        <template v-if="mine.length === 1">
          <p class="font-semibold">{{ mine[0]!.name }} in hand?</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="rounded-lg bg-accent p-4 text-accent-fg"
              @click="instrument = mine[0]!.id"
            >
              🎸 Yes
            </button>
            <button
              type="button"
              class="rounded-lg border border-border p-4"
              @click="instrument = null"
            >
              🧠 No — practise in my head
            </button>
          </div>
        </template>
        <template v-else>
          <p class="font-semibold">Which instrument is in your hands?</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="m in mine"
              :key="m.id"
              type="button"
              class="rounded-lg bg-accent p-4 text-accent-fg"
              @click="instrument = m.id"
            >
              🎸 {{ m.name }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-border p-4"
              @click="instrument = null"
            >
              🧠 None — practise in my head
            </button>
          </div>
        </template>
      </template>
      <template v-else>
        <p class="font-semibold">How long have you got?</p>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="m in [3, 5, 15]"
            :key="m"
            type="button"
            class="rounded-lg bg-accent p-4 text-accent-fg"
            @click="emit('start', instrument, m)"
          >
            {{ m }} min
          </button>
        </div>
        <button type="button" class="text-sm text-ink-muted" @click="instrument = undefined">
          ‹ change
        </button>
      </template>
      <p class="text-sm text-ink-muted">
        You practised on {{ summary.practice_days_last_7 }} of the last 7 days.
      </p>
      <TapCheck v-if="tapping" @done="tapping = false" />
      <p v-else class="text-xs text-ink-muted">
        <template v-if="spike.state.live.tap_ms !== null"
          >Your tap time: {{ spike.state.live.tap_ms }} ms — only the time spent knowing counts.
        </template>
        <template v-else>Timed drills count your tapping time too. </template>
        <button type="button" class="underline" @click="tapping = true">
          {{ spike.state.live.tap_ms !== null ? 'Redo the tap check' : 'Do a 20-second tap check' }}
        </button>
      </p>
    </section>

    <div v-if="mine.length > 1" class="flex gap-2" role="tablist">
      <button
        v-for="m in mine"
        :key="m.id"
        type="button"
        role="tab"
        :aria-selected="shownId === m.id"
        class="rounded-full border border-border px-3 py-1 text-sm"
        :class="{ 'bg-accent text-accent-fg': shownId === m.id }"
        @click="shown = m.id"
      >
        {{ m.name }}
      </button>
    </div>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Your progress this week</h2>
      <ul v-if="summary.progress.length" class="flex flex-col gap-2">
        <li
          v-for="p in summary.progress.slice(0, 5)"
          :key="p.node_id"
          class="rounded-lg bg-surface-raised p-3 text-sm"
        >
          <p class="font-semibold">{{ nodeName(p.node_id) }}</p>
          <p class="text-ink-muted">{{ changes(p).join(' · ') }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-ink-muted">
        A fresh week — every session from here shows up as progress.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="text-lg font-semibold">Your improvement opportunities</h2>
      <ul v-if="summary.opportunities.length" class="flex flex-col gap-1 text-sm">
        <li
          v-for="o in summary.opportunities"
          :key="`${o.kind}-${o.node_id}`"
          class="rounded-lg border border-border p-2"
        >
          {{ opportunityText(o) }}
        </li>
      </ul>
      <p v-else class="text-sm text-ink-muted">
        Nothing waiting — practise ahead or explore something new.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-lg font-semibold">Your skills and concepts</h2>
      <div v-for="a in summary.areas" :key="a.node_id" class="flex flex-col gap-1">
        <h3 class="text-sm font-semibold text-ink-muted">{{ nodeName(a.node_id) }}</h3>
        <ul class="flex flex-col gap-1 text-sm">
          <li v-for="n in a.nodes" :key="n.node_id" class="flex items-center justify-between gap-2">
            <span>{{ nodeName(n.node_id) }}</span>
            <span class="flex items-center gap-2 text-xs text-ink-muted">
              {{ n.met }}/{{ n.total }} started
              <LevelChip v-if="n.met" :level="n.level ?? 'new'" />
            </span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
