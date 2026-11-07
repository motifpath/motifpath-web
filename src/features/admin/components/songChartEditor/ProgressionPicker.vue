<script setup lang="ts">
/**
 * The progression catalog to tag a section with: every progression by the name learners see, a
 * search, and a check on the ones the section is tagged with. Picking one tags the section with
 * it, or untags it. Nothing is suggested from the chords: the author knows what a section is
 * built on. A progression the drills don't use is marked. A search that finds nothing offers to
 * create it. Removing a progression happens only in Admin › Progressions, never here.
 */
import { Check, Plus, Search } from 'lucide-vue-next'
import { computed } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { barsLabel, numeralsOf, progressionMatches } from '@/features/admin/utils/progressionDraft'
import { useLocalizedName } from '@/shared/composables/useLocalizedName'
import { useTypedT } from '@/shared/composables/useTypedT'

type Progression = components['schemas']['Progression']

const props = defineProps<{
  progressions: Progression[]
  /** The keys the section is tagged with. */
  tagged: string[]
}>()
const emit = defineEmits<{ toggle: [key: string]; create: [numerals: string] }>()

const { t } = useTypedT()
const { localizedName } = useLocalizedName()

const query = defineModel<string>('query', { default: '' })

const typedNumerals = computed(() => numeralsOf(query.value))

const shown = computed(() =>
  props.progressions
    .map((p) => ({ progression: p, name: localizedName(p.names) }))
    .filter(({ progression, name }) => progressionMatches(progression, name, query.value))
    .map(({ progression, name }) => ({ key: progression.key, name, inDrills: progression.in_drills })),
)
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
    <ul class="flex max-h-72 flex-col overflow-y-auto" :aria-label="t('songChartEditor.progressions')">
      <li v-for="p in shown" :key="p.key">
        <button
          type="button"
          data-test="progression-option"
          :aria-pressed="tagged.includes(p.key)"
          class="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-2 text-left text-base hover:bg-surface-sunken"
          :class="tagged.includes(p.key) ? 'text-accent-text' : 'text-ink'"
          @click="emit('toggle', p.key)"
        >
          {{ p.name }}
          <span class="flex shrink-0 items-center gap-2">
            <span v-if="!p.inDrills" data-test="chart-only" class="rounded-full bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-ink-muted">{{ t('songChartEditor.chartOnly') }}</span>
            <Check v-if="tagged.includes(p.key)" :size="18" aria-hidden="true" />
          </span>
        </button>
      </li>
    </ul>
    <template v-if="!shown.length">
      <p data-test="no-progression" class="px-2 py-3 text-sm text-ink-muted">
        {{ typedNumerals ? t('songChartEditor.noProgressionYet', { numerals: barsLabel(typedNumerals) }) : t('songChartEditor.noProgression', { query: query.trim() }) }}
      </p>
      <button
        type="button"
        data-test="create-progression"
        class="flex min-h-11 w-full items-center gap-2 rounded-lg bg-accent-muted px-2 text-left text-base font-semibold text-accent-text"
        @click="emit('create', typedNumerals ? query.trim() : '')"
      >
        <Plus :size="18" class="shrink-0" aria-hidden="true" />
        {{ typedNumerals ? t('songChartEditor.createNumerals', { numerals: barsLabel(typedNumerals) }) : t('songChartEditor.createProgression') }}
      </button>
      <p v-if="typedNumerals" data-test="create-progression-hint" class="px-2 py-1 text-xs text-ink-muted">
        {{ t('songChartEditor.readAsNumerals', { numerals: typedNumerals.join(' · ') }) }}
      </p>
    </template>
  </div>
</template>
