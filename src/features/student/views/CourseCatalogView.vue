<script setup lang="ts">
import { Check, Search } from 'lucide-vue-next'
import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import TeacherFilterPicker from '@/features/student/components/TeacherFilterPicker.vue'
import { useCourseCatalog } from '@/features/student/composables/useCourseCatalog'
import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import SkillConceptTreePicker from '@/shared/components/SkillConceptTreePicker.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useListConcepts } from '@/shared/composables/useListConcepts'
import { useListSkills } from '@/shared/composables/useListSkills'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { mostSpecificIds, type TreeNode } from '@/shared/utils/skillConceptTree'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']
type CourseLevel = CourseCatalogEntry['level']

const LEVELS: CourseLevel[] = ['beginner', 'early_intermediate', 'intermediate', 'advanced', 'expert']

const { t } = useTypedT()
const toast = useToast()

const {
  courses,
  total,
  filters,
  searchText,
  hasActiveFilters,
  clearFilters,
  isLoading,
  isLoadingMore,
  error,
  loadMoreError,
  retry,
  loadMore,
} = useCourseCatalog()
const { enrollments } = useMyCourseEnrollments()
const { enrollInCourse } = useEnrollInCourse()

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
// showing the full selection the student made.
const pickedSkillIds = ref<string[]>([])
const pickedConceptIds = ref<string[]>([])
function onSkillsPicked(ids: string[]) {
  pickedSkillIds.value = ids
  filters.skillIds = mostSpecificIds(skillNodes.value, ids)
}
function onConceptsPicked(ids: string[]) {
  pickedConceptIds.value = ids
  filters.conceptIds = mostSpecificIds(conceptNodes.value, ids)
}

function toggleLevel(level: CourseLevel) {
  filters.levels = filters.levels.includes(level)
    ? filters.levels.filter((l) => l !== level)
    : [...filters.levels, level]
}

function filterByTeacher(course: CourseCatalogEntry) {
  filters.teacher = course.created_by
}

function onClearFilters() {
  pickedSkillIds.value = []
  pickedConceptIds.value = []
  clearFilters()
}

// Courses enrolled into from this screen, on top of the active enrollments
// loaded with it — so a card flips to "Enrolled" without refetching.
const newlyEnrolledCourseIds = ref(new Set<string>())
const enrollingCourseId = ref<string | null>(null)
const enrolledCourseIds = computed(
  () =>
    new Set([
      ...enrollments.value.filter((e) => e.status === 'active').map((e) => e.course_id),
      ...newlyEnrolledCourseIds.value,
    ]),
)

async function enroll(course: CourseCatalogEntry) {
  enrollingCourseId.value = course.course_id
  try {
    const result = await enrollInCourse(course.course_id)
    newlyEnrolledCourseIds.value = new Set([...newlyEnrolledCourseIds.value, course.course_id])
    if (result.outcome === 'enrolled') {
      toast.success(t('courseCatalogView.enrolledToast', { title: course.title }))
    }
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    enrollingCourseId.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold text-accent-text">{{ t('courseCatalogView.heading') }}</h1>

    <div class="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4">
      <label class="relative flex items-center">
        <span class="sr-only">{{ t('courseCatalogView.searchLabel') }}</span>
        <Search :size="16" class="pointer-events-none absolute left-3 text-ink-subtle" aria-hidden="true" />
        <input
          v-model="searchText"
          data-test="catalog-search"
          type="search"
          :placeholder="t('courseCatalogView.searchPlaceholder')"
          class="w-full rounded-md border border-border bg-surface-sunken py-2 pl-9 pr-3 text-sm"
        />
      </label>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
          {{ t('courseCatalogView.levelFilterLabel') }}
        </span>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="level in LEVELS"
            :key="level"
            type="button"
            :data-test="`level-filter-${level}`"
            :aria-pressed="filters.levels.includes(level)"
            class="flex items-center gap-1 rounded-full border px-3 py-1 text-sm"
            :class="
              filters.levels.includes(level)
                ? 'border-accent bg-accent text-accent-fg'
                : 'border-border bg-surface text-ink-muted'
            "
            @click="toggleLevel(level)"
          >
            <Check v-if="filters.levels.includes(level)" :size="14" aria-hidden="true" />
            {{ t(`levels.${level}`) }}
          </button>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3">
        <TeacherFilterPicker v-model="filters.teacher" />
        <SkillConceptTreePicker
          :label="t('courseCatalogView.skillFilterLabel')"
          :nodes="skillNodes"
          :selected-ids="pickedSkillIds"
          :is-loading="skillsLoading"
          :creatable="false"
          @update:selected-ids="onSkillsPicked"
        />
        <SkillConceptTreePicker
          :label="t('courseCatalogView.conceptFilterLabel')"
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
          @click="onClearFilters"
        >
          {{ t('courseCatalogView.clearFilters') }}
        </button>
      </div>
    </div>

    <StateLoading v-if="isLoading" data-test="loading" :noun="t('courseCatalogView.loadingNoun')" />

    <StateError v-else-if="error" data-test="error" :message="t('courseCatalogView.errorMessage')" @retry="retry" />

    <StateEmpty
      v-else-if="courses.length === 0 && hasActiveFilters"
      data-test="no-matches"
      :heading="t('courseCatalogView.noMatchesHeading')"
      :message="t('courseCatalogView.noMatchesMessage')"
    >
      <template #action>
        <button
          type="button"
          data-test="clear-filters"
          class="text-sm font-semibold text-accent-text underline"
          @click="onClearFilters"
        >
          {{ t('courseCatalogView.clearFilters') }}
        </button>
      </template>
    </StateEmpty>

    <StateEmpty
      v-else-if="courses.length === 0"
      data-test="empty"
      :heading="t('courseCatalogView.emptyHeading')"
      :message="t('courseCatalogView.emptyMessage')"
    />

    <template v-else>
      <ul class="flex flex-col gap-3">
        <li
          v-for="course in courses"
          :key="course.course_id"
          data-test="course-card"
          class="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h2 class="text-lg font-semibold text-ink">{{ course.title }}</h2>
            <span class="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
              {{ t(`levels.${course.level}`) }}
            </span>
          </div>
          <p data-test="course-teacher" class="text-sm text-ink-subtle">
            {{ t('courseCatalogView.courseTeacher', { name: course.created_by.display_name }) }}
          </p>
          <p class="text-sm text-ink-muted">{{ course.summary }}</p>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              data-test="more-from-teacher"
              class="text-sm font-semibold text-accent-text underline"
              @click="filterByTeacher(course)"
            >
              {{ t('courseCatalogView.moreFromTeacher') }}
            </button>
            <span
              v-if="enrolledCourseIds.has(course.course_id)"
              data-test="enrolled"
              class="flex items-center gap-1 text-sm font-semibold text-success"
            >
              <Check :size="16" aria-hidden="true" />
              {{ t('courseCatalogView.enrolled') }}
            </span>
            <PrimaryButton
              v-else
              data-test="enroll"
              :disabled="enrollingCourseId === course.course_id"
              @click="enroll(course)"
            >
              {{
                enrollingCourseId === course.course_id
                  ? t('courseCatalogView.enrolling')
                  : t('courseCatalogView.enroll')
              }}
            </PrimaryButton>
          </div>
        </li>
      </ul>
      <LoadMoreButton
        :loaded="courses.length"
        :total="total"
        :loading="isLoadingMore"
        :failed="loadMoreError"
        @load="loadMore"
      />
    </template>
  </section>
</template>
