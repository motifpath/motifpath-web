<script setup lang="ts">
/**
 * Discover's few filters, bound to a set of filters: Level (several), Instrument and Language (one
 * each) as chips, and Teacher as a row that opens its own list. Tapping a chosen single chip clears
 * it, so there is no Any chip. A skill or concept is never offered here; one that came with the
 * address is kept as it is.
 */
import { UserRound } from 'lucide-vue-next'
import { computed } from 'vue'

import { CATALOG_LEVELS, type DiscoverFilters } from '@/features/student/utils/discoverQuery'
import { OFFERED_LANGUAGE_CODES } from '@/i18n'
import ChoiceChip from '@/shared/components/ChoiceChip.vue'
import MenuRow from '@/shared/components/MenuRow.vue'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

type SingleKey = 'instrument' | 'language'

const props = defineProps<{
  instruments: { id: string; name: string }[]
  /** The chosen teacher's name, once known. */
  teacherName: string | null
}>()
const filters = defineModel<DiscoverFilters>({ required: true })
const emit = defineEmits<{ openTeacher: [] }>()

const { t } = useTypedT()

const levelOptions = computed(() => CATALOG_LEVELS.map((level) => ({ value: level, label: t(`levels.${level}`) })))

const singleOptions = computed<Record<SingleKey, { value: string; label: string }[]>>(() => ({
  instrument: props.instruments.map((instrument) => ({ value: instrument.id, label: instrument.name })),
  language: OFFERED_LANGUAGE_CODES.map((code) => {
    const key = languageLabelKey(code)
    return { value: code, label: key ? t(key) : code }
  }),
}))
const SINGLE_KEYS: SingleKey[] = ['instrument', 'language']

function toggleLevel(level: DiscoverFilters['levels'][number]) {
  const levels = filters.value.levels.includes(level)
    ? filters.value.levels.filter((chosen) => chosen !== level)
    : CATALOG_LEVELS.filter((candidate) => candidate === level || filters.value.levels.includes(candidate))
  filters.value = { ...filters.value, levels }
}

function toggleSingle(key: SingleKey, value: string) {
  const next: DiscoverFilters = { ...filters.value }
  if (next[key] === value) delete next[key]
  else next[key] = value
  filters.value = next
}

const teacherSummary = computed(() => {
  if (!filters.value.teacher) return t('teacherFilterPicker.anyTeacher')
  return props.teacherName ?? '…'
})

const GROUP_HEADING = 'text-xs font-semibold uppercase tracking-wide text-ink-subtle'
</script>

<template>
  <div class="flex flex-col gap-5">
    <fieldset data-test="filter-group-levels" class="flex flex-col gap-1">
      <legend :class="GROUP_HEADING">{{ t('discoverFilters.groups.levels') }}</legend>
      <div class="flex flex-wrap gap-x-2">
        <ChoiceChip
          v-for="option in levelOptions"
          :key="option.value"
          :label="option.label"
          :selected="filters.levels.includes(option.value)"
          @toggle="toggleLevel(option.value)"
        />
      </div>
    </fieldset>

    <fieldset v-for="key in SINGLE_KEYS" :key="key" :data-test="`filter-group-${key}`" class="flex flex-col gap-1">
      <legend :class="GROUP_HEADING">{{ t(`discoverFilters.groups.${key}`) }}</legend>
      <div class="flex flex-wrap gap-x-2">
        <ChoiceChip
          v-for="option in singleOptions[key]"
          :key="option.value"
          :label="option.label"
          :selected="filters[key] === option.value"
          @toggle="toggleSingle(key, option.value)"
        />
      </div>
    </fieldset>

    <div data-test="filter-group-teacher">
      <MenuRow
        class="-mx-4"
        :label="t('discoverFilters.groups.teacher')"
        :icon="UserRound"
        :value="teacherSummary"
        chevron
        @click="emit('openTeacher')"
      />
    </div>
  </div>
</template>
