<script setup lang="ts">
import { Check, Search } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import InstrumentFilterSelect from '@/shared/components/InstrumentFilterSelect.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import TeacherFilterPicker from '@/shared/components/TeacherFilterPicker.vue'
import type { CourseCreatorsScope } from '@/shared/composables/useCourseCreators'
import { useListConcepts } from '@/shared/composables/useListConcepts'
import { useListSkills } from '@/shared/composables/useListSkills'
import { useTypedT } from '@/shared/composables/useTypedT'
import { DIFFICULTY_LEVELS } from '@/shared/utils/levels'
import { mostSpecificIds, type TreeNode } from '@/shared/utils/skillConceptTree'

type CourseLevel = components['schemas']['CourseCatalogEntry']['level']
type UserRef = components['schemas']['UserRef']

const props = withDefaults(
  defineProps<{
    /** Whether any filter or search is set, which shows the clear control. */
    hasActiveFilters: boolean
    /** Which course list's teachers the teacher filter offers; omit to hide it. */
    teacherScope?: CourseCreatorsScope | null
    /** Whether to offer the instrument filter. */
    instrumentFilter?: boolean
    /** Whether to offer the language filter. */
    languageFilter?: boolean
    /** The search box's placeholder; defaults to searching courses. */
    searchPlaceholder?: string
  }>(),
  { teacherScope: null, instrumentFilter: false, languageFilter: false, searchPlaceholder: undefined },
)
const emit = defineEmits<{ clear: [] }>()

const searchText = defineModel<string>('searchText', { required: true })
const levels = defineModel<CourseLevel[]>('levels', { required: true })
const skillIds = defineModel<string[]>('skillIds', { required: true })
const conceptIds = defineModel<string[]>('conceptIds', { required: true })
const teacher = defineModel<UserRef | null>('teacher', { default: null })
const instrumentId = defineModel<string | null>('instrumentId', { default: null })
const language = defineModel<string | null>('language', { default: null })

const { t } = useTypedT()

const { skills, isLoading: skillsLoading } = useListSkills()
const { concepts, isLoading: conceptsLoading } = useListConcepts()
const skillNodes = computed<TreeNode[]>(() =>
  skills.value.map((s) => ({ id: s.skill_id, name: s.name, parent_id: s.parent_id })),
)
const conceptNodes = computed<TreeNode[]>(() =>
  concepts.value.map((c) => ({ id: c.concept_id, name: c.name, parent_id: c.parent_id })),
)

// The picker keeps a node's ancestors selected alongside it; the filter only
// sends the most specific picks (see mostSpecificIds), but the picker keeps
// showing the full selection that was made. Clearing the filters from
// outside empties the picks too.
const pickedSkillIds = ref<string[]>([])
const pickedConceptIds = ref<string[]>([])
watch(skillIds, (ids) => {
  if (ids.length === 0) pickedSkillIds.value = []
})
watch(conceptIds, (ids) => {
  if (ids.length === 0) pickedConceptIds.value = []
})
function onSkillsPicked(ids: string[]) {
  pickedSkillIds.value = ids
  skillIds.value = mostSpecificIds(skillNodes.value, ids)
}
function onConceptsPicked(ids: string[]) {
  pickedConceptIds.value = ids
  conceptIds.value = mostSpecificIds(conceptNodes.value, ids)
}

function toggleLevel(level: CourseLevel) {
  levels.value = levels.value.includes(level)
    ? levels.value.filter((l) => l !== level)
    : [...levels.value, level]
}

const pickerColumns = computed(() => (props.teacherScope ? 'sm:grid-cols-3' : 'sm:grid-cols-2'))
</script>

<template>
  <div class="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4">
    <label class="relative flex items-center">
      <span class="sr-only">{{ t('courseFilters.searchLabel') }}</span>
      <Search
        :size="16"
        class="pointer-events-none absolute left-3 text-ink-subtle"
        aria-hidden="true"
      />
      <input
        v-model="searchText"
        data-test="catalog-search"
        type="search"
        :placeholder="searchPlaceholder ?? t('courseFilters.searchPlaceholder')"
        class="w-full rounded-md border border-border bg-surface-sunken py-2 pl-9 pr-3 text-sm"
      />
    </label>

    <div class="flex flex-col gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {{ t('courseFilters.levelFilterLabel') }}
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="level in DIFFICULTY_LEVELS"
          :key="level"
          type="button"
          :data-test="`level-filter-${level}`"
          :aria-pressed="levels.includes(level)"
          class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
          :class="
            levels.includes(level)
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-border bg-surface text-ink-muted'
          "
          @click="toggleLevel(level)"
        >
          <Check v-if="levels.includes(level)" :size="14" aria-hidden="true" />
          {{ t(`levels.${level}`) }}
        </button>
      </div>
    </div>

    <div v-if="instrumentFilter || languageFilter || $slots.default" class="flex flex-wrap items-end gap-4">
      <InstrumentFilterSelect v-if="instrumentFilter" v-model="instrumentId" />
      <label v-if="languageFilter" class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('courseFilters.languageFilterLabel') }}
        </span>
        <LanguageSelect
          v-model="language"
          data-test="language-filter"
          :empty-label="t('courseFilters.anyLanguage')"
        />
      </label>
      <slot />
    </div>

    <div class="grid gap-4" :class="pickerColumns">
      <TeacherFilterPicker v-if="teacherScope" v-model="teacher" :scope="teacherScope" />
      <SkillConceptTreePicker
        :label="t('courseFilters.skillFilterLabel')"
        :nodes="skillNodes"
        :selected-ids="pickedSkillIds"
        :is-loading="skillsLoading"
        :creatable="false"
        @update:selected-ids="onSkillsPicked"
      />
      <SkillConceptTreePicker
        :label="t('courseFilters.conceptFilterLabel')"
        :nodes="conceptNodes"
        :selected-ids="pickedConceptIds"
        :is-loading="conceptsLoading"
        :creatable="false"
        @update:selected-ids="onConceptsPicked"
      />
    </div>

    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="text-sm font-semibold text-accent-text underline"
        @click="emit('clear')"
      >
        {{ t('courseFilters.clearFilters') }}
      </button>
    </div>
  </div>
</template>
