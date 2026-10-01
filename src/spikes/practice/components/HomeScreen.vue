<script setup lang="ts">
/** The call to practise: two taps from here to the first item. */
import { computed, ref } from 'vue'

import { itemByKey, pathSkillIds, skills } from '@/spikes/practice/fixtures/catalog'
import { usePracticeSpike } from '@/spikes/practice/usePracticeSpike'
import { descendantIds } from '@/spikes/practice/taxonomy'

const emit = defineEmits<{ start: [instrumentInHand: boolean, minutes: number] }>()
const spike = usePracticeSpike()

const instrument = ref<boolean | null>(null)

const pathSkills = new Set(pathSkillIds.flatMap((id) => descendantIds(skills, id)))
const fading = computed(
  () =>
    [...spike.states.value.values()].filter(
      (s) => s.fading && itemByKey(s.item_key)?.skill_ids.some((id) => pathSkills.has(id)),
    ).length,
)
const latestNote = computed(() => spike.activeNotes.value[0])
const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id

const practisedDays = computed(() => {
  const days = new Set<string>()
  const weekAgo = spike.now.value.getTime() - 7 * 86_400_000
  for (const e of spike.evidence.value) {
    if (Date.parse(e.occurred_at) > weekAgo) days.add(e.occurred_at.slice(0, 10))
  }
  return days.size
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <section class="flex flex-col gap-3 rounded-xl bg-surface-raised p-4 shadow-level1">
      <h1 class="text-xl font-semibold">Daily practice</h1>
      <p v-if="fading" class="text-ink-muted">
        <span class="font-semibold text-ink">{{ fading }} {{ fading === 1 ? 'thing is' : 'things are' }} fading</span> from memory — a few minutes brings them back.
      </p>
      <p v-else class="text-ink-muted">Everything you've learned is fresh. Keep it that way.</p>

      <div v-if="latestNote" class="rounded-lg bg-accent-muted p-3 text-sm">
        <p class="font-semibold text-accent-text">From your teacher</p>
        <p>{{ latestNote.summary }}</p>
        <p v-if="latestNote.needs_work.skill_ids.length" class="mt-1 text-xs text-ink-muted">
          Work on: {{ latestNote.needs_work.skill_ids.map(skillName).join(', ') }}
          <template v-if="latestNote.suggested_item_keys.length">
            · suggested: {{ latestNote.suggested_item_keys.map((k) => itemByKey(k)?.label ?? k).join(', ') }}
          </template>
        </p>
      </div>

      <template v-if="instrument === null">
        <p class="font-semibold">Guitar in hand?</p>
        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="rounded-lg bg-accent p-4 text-accent-fg" @click="instrument = true">🎸 Yes</button>
          <button type="button" class="rounded-lg border border-border p-4" @click="instrument = false">🧠 No — practise in my head</button>
        </div>
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
        <button type="button" class="text-sm text-ink-muted" @click="instrument = null">‹ change</button>
      </template>
    </section>

    <p class="text-sm text-ink-muted">You practised on {{ practisedDays }} of the last 7 days.</p>
  </div>
</template>
