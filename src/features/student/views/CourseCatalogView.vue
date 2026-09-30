<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { useCourseCatalog } from '@/features/student/composables/useCourseCatalog'
import { useEnrollInCourse } from '@/features/student/composables/useEnrollInCourse'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import CourseCard from '@/shared/components/CourseCard.vue'
import CourseFilters from '@/shared/components/CourseFilters.vue'
import LoadMoreButton from '@/shared/components/LoadMoreButton.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import StateEmpty from '@/shared/components/StateEmpty.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type CourseCatalogEntry = components['schemas']['CourseCatalogEntry']

const { t } = useTypedT()
const toast = useToast()
const { instrumentsLabel } = useInstrumentNames()

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

function filterByTeacher(course: CourseCatalogEntry) {
  filters.teacher = course.created_by
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

    <CourseFilters
      v-model:search-text="searchText"
      v-model:levels="filters.levels"
      v-model:skill-ids="filters.skillIds"
      v-model:concept-ids="filters.conceptIds"
      v-model:teacher="filters.teacher"
      v-model:instrument-id="filters.instrumentId"
      v-model:language="filters.language"
      instrument-filter
      language-filter
      teacher-scope="catalog"
      :has-active-filters="hasActiveFilters"
      @clear="clearFilters"
    />

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
          @click="clearFilters"
        >
          {{ t('courseFilters.clearFilters') }}
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
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="course in courses" :key="course.course_id">
          <CourseCard
            :title="course.title"
            :summary="course.summary"
            :created-by="course.created_by"
            :level="course.level"
            :language="course.language"
            :lesson-count="course.lesson_count"
            :checkpoint-count="course.checkpoint_count"
            :thumbnail-url="course.thumbnail_url"
          >
            <template #supporting>
              <p data-test="course-instruments" class="text-sm text-ink-subtle">
                {{ instrumentsLabel(course.instrument_ids) }}
              </p>
            </template>
            <template #actions>
              <button
                type="button"
                data-test="more-from-teacher"
                class="text-sm font-semibold text-accent-text underline"
                @click="filterByTeacher(course)"
              >
                {{ t('courseCatalogView.moreFromTeacher') }}
              </button>
              <RouterLink
                :to="{ name: 'course-detail', params: { courseId: course.course_id } }"
                data-test="details"
                class="text-sm font-semibold text-accent-text underline"
              >
                {{ t('courseCatalogView.details') }}
              </RouterLink>
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
            </template>
          </CourseCard>
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
