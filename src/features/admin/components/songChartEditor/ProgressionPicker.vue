<script setup lang="ts">
/**
 * The progression catalog to tag a section with: every progression by the name learners see, a
 * search, and a check on the ones the section is tagged with. Picking one tags the section with
 * it, or untags it. Nothing is suggested from the chords: the author knows what a section is
 * built on.
 */
import { Check, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Progression = components['schemas']['Progression']

const props = defineProps<{
  progressions: Progression[]
  /** The keys the section is tagged with. */
  tagged: string[]
}>()
const emit = defineEmits<{ toggle: [key: string] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const query = ref('')

/** Typed numerals match the key, and any word matches the name, whatever the case. */
const shown = computed(() => {
  const q = query.value.trim().toLowerCase()
  const named = props.progressions.map((p) => ({ key: p.key, name: localizedName(p.names) }))
  return q ? named.filter((p) => p.key.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) : named
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-2">
      <Search :size="16" class="shrink-0 text-ink-muted" aria-hidden="true" />
      <input
        v-model="query"
        data-test="progression-search"
        type="search"
        :placeholder="t('songChartEditor.progressionSearch')"
        :aria-label="t('songChartEditor.progressionSearch')"
        class="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
      />
    </label>
    <ul class="flex max-h-72 flex-col overflow-y-auto" role="menu" :aria-label="t('songChartEditor.progressions')">
      <li v-for="p in shown" :key="p.key">
        <button
          type="button"
          role="menuitemcheckbox"
          data-test="progression-option"
          :aria-checked="tagged.includes(p.key)"
          class="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-base hover:bg-surface-sunken"
          :class="tagged.includes(p.key) ? 'text-accent-text' : 'text-ink'"
          @click="emit('toggle', p.key)"
        >
          {{ p.name }}
          <Check v-if="tagged.includes(p.key)" :size="18" class="shrink-0" aria-hidden="true" />
        </button>
      </li>
    </ul>
    <p v-if="!shown.length" data-test="no-progression" class="px-2 py-3 text-sm text-ink-muted">{{ t('songChartEditor.noProgression', { query: query.trim() }) }}</p>
  </div>
</template>
