<script setup lang="ts">
/** The student's own recordings: then vs now per item, and sending one for review. */
import { computed } from 'vue'

import { itemByKey } from '@/spikes/practice/fixtures/catalog'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'

const spike = usePracticeSpike()

const groups = computed(() => {
  const byItem = new Map<string, typeof spike.state.takes>()
  for (const t of spike.state.takes) byItem.set(t.item_key, [...(byItem.get(t.item_key) ?? []), t])
  return [...byItem.entries()].map(([key, takes]) => ({ item: itemByKey(key), takes }))
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <h1 class="text-xl font-semibold">Your takes</h1>
    <p v-if="!groups.length" class="text-ink-muted">
      No takes yet. Tick "Record this take" in a play-along to keep one — only you see it unless you send it to your teacher.
    </p>
    <section v-for="g in groups" :key="g.item?.item_key" class="flex flex-col gap-2">
      <h2 class="font-semibold">{{ g.item?.label }}</h2>
      <div v-if="g.takes.length > 1" class="grid grid-cols-2 gap-2">
        <figure v-for="(t, i) in [g.takes[0]!, g.takes[g.takes.length - 1]!]" :key="t.take_id" class="flex flex-col gap-1">
          <figcaption class="text-xs text-ink-muted">{{ i === 0 ? 'Then' : 'Now' }} · {{ t.bpm }} BPM · {{ new Date(t.recorded_at).toLocaleDateString() }}</figcaption>
          <video :src="t.media_url" controls playsinline class="w-full rounded-lg bg-surface-sunken" />
        </figure>
      </div>
      <ul class="flex flex-col gap-1 text-sm">
        <li v-for="t in g.takes" :key="t.take_id" class="flex items-center justify-between gap-2 rounded-lg bg-surface-raised p-2">
          <span>{{ t.bpm }} BPM · {{ t.duration_seconds }}s</span>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-1 text-xs"
            :disabled="t.sent_for_review"
            @click="t.sent_for_review = true"
          >
            {{ t.sent_for_review ? 'Sent to teacher' : 'Send for review' }}
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
