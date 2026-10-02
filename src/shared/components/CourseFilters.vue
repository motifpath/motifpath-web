<script setup lang="ts">
import { Check, Search, SlidersHorizontal, X } from 'lucide-vue-next'
import { computed, ref, useId, watch, type Ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import InstrumentFilterSelect from '@/shared/components/InstrumentFilterSelect.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import ModalCloseButton from '@/shared/components/ModalCloseButton.vue'
import ModalOverlay from '@/shared/components/ModalOverlay.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import TeacherFilterPicker from '@/shared/components/TeacherFilterPicker.vue'
import type { CourseCreatorsScope } from '@/shared/composables/useCourseCreators'
import { useKnowledgeTrees } from '@/shared/composables/useKnowledgeTrees'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'
import { DIFFICULTY_LEVELS } from '@/shared/utils/levels'
import { ancestorIds, descendantIds, filterIds, selectionSummary, type TreeNode } from '@/shared/utils/skillConceptTree'

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
    /** Whether to offer the level filter; off for items that have no level. */
    levelFilter?: boolean
    /** Picks at most one skill and one concept, for lists filtered by a single one of each. */
    singleClassification?: boolean
    /** The search box's placeholder; defaults to searching courses. */
    searchPlaceholder?: string
    /** Shows search first and moves the remaining controls into a modal. */
    compact?: boolean
  }>(),
  {
    teacherScope: null,
    instrumentFilter: false,
    languageFilter: false,
    levelFilter: true,
    singleClassification: false,
    searchPlaceholder: undefined,
    compact: false,
  },
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
const { instrumentsLabel } = useInstrumentNames()
const advancedOpen = ref(false)
const advancedTitleId = useId()

const pickedSkillIds = ref<string[]>([])
const pickedConceptIds = ref<string[]>([])
const {
  skillNodes,
  conceptNodes,
  skillsLoading,
  conceptsLoading,
  skillsError,
  conceptsError,
  retrySkills,
  retryConcepts,
  suggestedSkillIds,
  suggestedConceptIds,
} = useKnowledgeTrees({ skillIds: pickedSkillIds, conceptIds: pickedConceptIds })

// The picker keeps a node's ancestors selected alongside it; the filter sends
// only what was meant (see filterIds): a node picked with its whole subtree
// filters by all of it, a parent picked only along with a child is left out.
// The picker keeps showing the full selection that was made. When the filter
// changes from outside the picker (restored, cleared, or a chip removed), the
// picks are rebuilt from it, so the picker never shows or re-sends a filter
// that is gone.
function picksFor(nodes: TreeNode[], picked: string[], ids: string[]): string[] {
  const fromPicker = filterIds(nodes, picked)
  if (fromPicker.length === ids.length && fromPicker.every((id) => ids.includes(id))) return picked
  const byId = new Map(nodes.map((n) => [n.id, n]))
  return Array.from(
    new Set(
      ids.flatMap((id) => {
        const node = byId.get(id)
        return node ? [...ancestorIds(nodes, node), id] : [id]
      }),
    ),
  )
}
watch(
  skillIds,
  (ids) => (pickedSkillIds.value = picksFor(skillNodes.value, pickedSkillIds.value, ids)),
  { immediate: true },
)
watch(
  conceptIds,
  (ids) => (pickedConceptIds.value = picksFor(conceptNodes.value, pickedConceptIds.value, ids)),
  { immediate: true },
)
function onSkillsPicked(ids: string[]) {
  pickedSkillIds.value = ids
  skillIds.value = filterIds(skillNodes.value, ids)
}
function onConceptsPicked(ids: string[]) {
  pickedConceptIds.value = ids
  conceptIds.value = filterIds(conceptNodes.value, ids)
}

function toggleLevel(level: CourseLevel) {
  levels.value = levels.value.includes(level)
    ? levels.value.filter((l) => l !== level)
    : [...levels.value, level]
}

const pickerColumns = computed(() => (props.teacherScope ? 'sm:grid-cols-3' : 'sm:grid-cols-2'))

type AppliedFilter = { key: string; label: string; clear: () => void }

/** One pill per picked node, a whole area as one pill counting the rest; clearing a pill clears its area. */
function classificationFilters(kind: 'skill' | 'concept', nodes: TreeNode[], ids: Ref<string[]>): AppliedFilter[] {
  return selectionSummary(nodes, ids.value).map(({ id, more }) => {
    const name = nodes.find((node) => node.id === id)?.name ?? '…'
    return {
      key: `${kind}-${id}`,
      label: more > 0 ? `${name} +${more}` : name,
      clear: () => {
        const cleared = new Set([id, ...descendantIds(nodes, id)])
        ids.value = ids.value.filter((other) => !cleared.has(other))
      },
    }
  })
}

const appliedFilters = computed<AppliedFilter[]>(() => {
  const filters: AppliedFilter[] = levels.value.map((level) => ({
    key: `level-${level}`,
    label: t(`levels.${level}`),
    clear: () => toggleLevel(level),
  }))

  if (teacher.value) {
    filters.push({
      key: 'teacher',
      label: teacher.value.display_name,
      clear: () => (teacher.value = null),
    })
  }
  if (instrumentId.value) {
    filters.push({
      key: 'instrument',
      label: instrumentsLabel([instrumentId.value]),
      clear: () => (instrumentId.value = null),
    })
  }
  if (language.value) {
    const labelKey = languageLabelKey(language.value)
    filters.push({
      key: 'language',
      label: labelKey ? t(labelKey) : language.value,
      clear: () => (language.value = null),
    })
  }
  filters.push(...classificationFilters('concept', conceptNodes.value, conceptIds))
  filters.push(...classificationFilters('skill', skillNodes.value, skillIds))

  return filters
})
</script>

<template>
  <template v-if="compact">
    <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3 sm:p-4">
      <div class="flex gap-2">
        <label class="relative min-w-0 flex-1">
          <span class="sr-only">{{ t('courseFilters.searchLabel') }}</span>
          <Search
            :size="16"
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
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
        <button
          type="button"
          data-test="advanced-filters"
          class="flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 text-sm font-semibold text-ink"
          @click="advancedOpen = true"
        >
          <SlidersHorizontal :size="16" aria-hidden="true" />
          {{ t('courseFilters.filters') }}
        </button>
      </div>

      <div v-if="appliedFilters.length" class="flex flex-wrap gap-2" :aria-label="t('courseFilters.appliedFilters')">
        <button
          v-for="filter in appliedFilters"
          :key="filter.key"
          type="button"
          :data-test="`applied-filter-${filter.key}`"
          class="flex items-center gap-1 rounded-full bg-accent-muted px-2.5 py-1 text-sm font-medium text-accent-text"
          @click="filter.clear"
        >
          {{ filter.label }}
          <X :size="14" aria-hidden="true" />
        </button>
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

    <ModalOverlay
      :open="advancedOpen"
      panel-class="flex max-h-[85vh] w-[min(720px,calc(100vw-32px))] flex-col gap-4 overflow-y-auto rounded-xl bg-surface-raised p-5 shadow-level2"
      @close="advancedOpen = false"
    >
      <div role="dialog" aria-modal="true" :aria-labelledby="advancedTitleId" class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <h2 :id="advancedTitleId" class="text-base font-bold text-ink">{{ t('courseFilters.filters') }}</h2>
          <ModalCloseButton @close="advancedOpen = false" />
        </div>

        <div v-if="levelFilter" class="flex flex-col gap-2">
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
              :class="levels.includes(level) ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink-muted'"
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
            <LanguageSelect v-model="language" data-test="language-filter" :empty-label="t('courseFilters.anyLanguage')" />
          </label>
          <slot />
        </div>

        <div class="grid gap-4" :class="pickerColumns">
          <TeacherFilterPicker v-if="teacherScope" v-model="teacher" :scope="teacherScope" />
          <SkillConceptTreePicker
            :label="t('courseFilters.conceptFilterLabel')"
            :nodes="conceptNodes"
            :selected-ids="pickedConceptIds"
            :is-loading="conceptsLoading"
            :suggested-ids="suggestedConceptIds"
            :load-failed="conceptsError"
            :multiple="!singleClassification"
            @update:selected-ids="onConceptsPicked"
            @retry="retryConcepts"
          />
          <SkillConceptTreePicker
            :label="t('courseFilters.skillFilterLabel')"
            :nodes="skillNodes"
            :selected-ids="pickedSkillIds"
            :is-loading="skillsLoading"
            :suggested-ids="suggestedSkillIds"
            :load-failed="skillsError"
            :multiple="!singleClassification"
            @update:selected-ids="onSkillsPicked"
            @retry="retrySkills"
          />
        </div>
      </div>
    </ModalOverlay>
  </template>

  <div v-else class="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4">
    <label class="relative flex items-center">
      <span class="sr-only">{{ t('courseFilters.searchLabel') }}</span>
      <Search :size="16" class="pointer-events-none absolute left-3 text-ink-subtle" aria-hidden="true" />
      <input
        v-model="searchText"
        data-test="catalog-search"
        type="search"
        :placeholder="searchPlaceholder ?? t('courseFilters.searchPlaceholder')"
        class="w-full rounded-md border border-border bg-surface-sunken py-2 pl-9 pr-3 text-sm"
      />
    </label>

    <div v-if="levelFilter" class="flex flex-col gap-2">
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
          :class="levels.includes(level) ? 'border-accent bg-accent text-accent-fg' : 'border-border bg-surface text-ink-muted'"
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
        <LanguageSelect v-model="language" data-test="language-filter" :empty-label="t('courseFilters.anyLanguage')" />
      </label>
      <slot />
    </div>

    <div class="grid gap-4" :class="pickerColumns">
      <TeacherFilterPicker v-if="teacherScope" v-model="teacher" :scope="teacherScope" />
      <SkillConceptTreePicker
        :label="t('courseFilters.conceptFilterLabel')"
        :nodes="conceptNodes"
        :selected-ids="pickedConceptIds"
        :is-loading="conceptsLoading"
        :suggested-ids="suggestedConceptIds"
        :load-failed="conceptsError"
        :multiple="!singleClassification"
        @update:selected-ids="onConceptsPicked"
        @retry="retryConcepts"
      />
      <SkillConceptTreePicker
        :label="t('courseFilters.skillFilterLabel')"
        :nodes="skillNodes"
        :selected-ids="pickedSkillIds"
        :is-loading="skillsLoading"
        :suggested-ids="suggestedSkillIds"
        :load-failed="skillsError"
        :multiple="!singleClassification"
        @update:selected-ids="onSkillsPicked"
        @retry="retrySkills"
      />
    </div>

    <div v-if="hasActiveFilters" class="flex flex-wrap items-center gap-2">
      <button type="button" class="text-sm font-semibold text-accent-text underline" @click="emit('clear')">
        {{ t('courseFilters.clearFilters') }}
      </button>
    </div>
  </div>
</template>
