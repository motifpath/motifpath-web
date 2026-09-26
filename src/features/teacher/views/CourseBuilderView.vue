<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import CourseCheckpointList from '@/features/teacher/components/CourseCheckpointList.vue'
import CourseStatusPanel from '@/features/teacher/components/CourseStatusPanel.vue'
import LearningPathPickerModal from '@/features/teacher/components/LearningPathPickerModal.vue'
import PublishedCourseModal from '@/features/teacher/components/PublishedCourseModal.vue'
import ThumbnailField from '@/features/teacher/components/ThumbnailField.vue'
import {
  useCourse,
  useCourseMutations,
  useLearningPathTitles,
} from '@/features/teacher/composables/useCourseAuthoring'
import { useCourseForm } from '@/features/teacher/composables/useCourseForm'
import AppBar from '@/shared/components/AppBar.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import LevelPicker from '@/shared/components/LevelPicker.vue'
import StateError from '@/shared/components/StateError.vue'
import StateLoading from '@/shared/components/StateLoading.vue'
import { useIsCompact } from '@/shared/composables/useIsCompact'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

type Course = components['schemas']['Course']
type LearningPath = components['schemas']['LearningPath']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { isCompact } = useIsCompact()
const { t } = useTypedT()
const toast = useToast()
const router = useRouter()

const route = useRoute()
const rawCourseId = route.params.id
const routeCourseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId

const {
  course: loadedCourse,
  isLoading,
  error: loadError,
  notFound,
  retry: retryLoad,
} = routeCourseId
  ? useCourse(routeCourseId)
  : { course: ref(null), isLoading: ref(false), error: ref(false), notFound: ref(false), retry: async () => {} }

const form = useCourseForm()
const { createCourse, replaceCourse, publishCourse, retireCourse, reactivateCourse } = useCourseMutations()
const { lookUp: lookUpPathTitles } = useLearningPathTitles(form.setPathTitle)

// The course as the server last described it, for its status and actions;
// null until a new course is first saved.
const savedCourse = ref<Course | null>(null)

function applySavedCourse(course: Course) {
  savedCourse.value = course
  form.loadFromCourse(course)
  void lookUpPathTitles(form.checkpointsMissingPathTitle.value)
}

watch(
  loadedCourse,
  (course) => {
    if (course) applySavedCourse(course)
  },
  { immediate: true },
)

// A retired course can't be edited until an admin reactivates it.
const readOnly = computed(() => savedCourse.value?.status === 'retired')

const saving = ref(false)
const busy = ref(false)
const thumbnailUploading = ref(false)
const justSaved = ref(false)
let justSavedTimeout: ReturnType<typeof setTimeout> | undefined
onUnmounted(() => clearTimeout(justSavedTimeout))

const canSave = computed(
  () => form.isValid.value && !saving.value && !busy.value && !thumbnailUploading.value,
)

/** Saves the form; resolves to the saved course, or null when saving failed. */
async function saveForm(): Promise<Course | null> {
  if (!form.isValid.value) return null
  const existingId = savedCourse.value?.course_id
  saving.value = true
  try {
    const request = form.toRequest()
    const course = existingId ? await replaceCourse(existingId, request) : await createCourse(request)
    applySavedCourse(course)
    if (!existingId) {
      await router.replace({ name: 'teacher-course-edit', params: { id: course.course_id } })
    }
    return course
  } catch (e) {
    toast.error(e instanceof Error ? e.message : t('courseBuilderView.saveFailed'))
    return null
  } finally {
    saving.value = false
  }
}

async function save() {
  const isUpdate = !!savedCourse.value
  const course = await saveForm()
  if (!course) return
  justSaved.value = true
  clearTimeout(justSavedTimeout)
  justSavedTimeout = setTimeout(() => (justSaved.value = false), 2000)
  toast.success(isUpdate ? t('courseBuilderView.courseSaved') : t('courseBuilderView.courseCreated'))
}

// Publishing the unchanged latest version again would only add an
// identical version.
const publishDisabled = computed(() => {
  const course = savedCourse.value
  if (!course || !form.isValid.value) return true
  return course.status === 'published' && !course.has_unpublished_changes && !form.isDirty.value
})

async function runAction(action: () => Promise<void>, failureMessage: string) {
  busy.value = true
  try {
    await action()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : failureMessage)
  } finally {
    busy.value = false
  }
}

function onPublish() {
  void runAction(async () => {
    const course = await saveForm()
    if (!course) return
    const version = await publishCourse(course.course_id)
    savedCourse.value = {
      ...course,
      status: 'published',
      latest_published_version: version.version_number,
      has_unpublished_changes: false,
    }
    toast.success(t('courseBuilderView.published', { version: version.version_number }))
  }, t('courseBuilderView.publishFailed'))
}

function onRetire() {
  const courseId = savedCourse.value?.course_id
  if (!courseId) return
  void runAction(async () => {
    applySavedCourse(await retireCourse(courseId))
    toast.success(t('courseBuilderView.retired'))
  }, t('courseBuilderView.retireFailed'))
}

function onReactivate() {
  const courseId = savedCourse.value?.course_id
  if (!courseId) return
  void runAction(async () => {
    applySavedCourse(await reactivateCourse(courseId))
    toast.success(t('courseBuilderView.reactivated'))
  }, t('courseBuilderView.reactivateFailed'))
}

const pickerOpen = ref(false)
const outlineOpen = ref(false)

function onPathPicked(path: LearningPath) {
  pickerOpen.value = false
  form.addCheckpoint(path)
}

function onUpdateOverride(index: number, value: string) {
  const checkpoint = form.checkpoints.value[index]
  if (checkpoint) checkpoint.override = value
}

// Leaving with unsaved changes asks first: in the app through a dialog, and
// on closing or reloading the tab through the browser's own prompt.
const leaveDialogOpen = ref(false)
let resolveLeave: ((leave: boolean) => void) | null = null

function answerLeave(leave: boolean) {
  leaveDialogOpen.value = false
  resolveLeave?.(leave)
  resolveLeave = null
}

onBeforeRouteLeave(() => {
  if (!form.isDirty.value || readOnly.value) return true
  leaveDialogOpen.value = true
  return new Promise<boolean>((resolve) => (resolveLeave = resolve))
})

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (form.isDirty.value && !readOnly.value) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

const breadcrumbLabel = computed(() =>
  routeCourseId || savedCourse.value
    ? form.title.value || t('courseBuilderView.editBreadcrumb')
    : t('courseBuilderView.newBreadcrumb'),
)
const bodyReady = computed(() => !isLoading.value && !loadError.value)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <AppBar
      context="teacher"
      :compact="isCompact"
      :primary-nav-to="{ name: 'teacher-courses' }"
      :breadcrumb-label="breadcrumbLabel"
      :show-save="canAuthor && bodyReady && !readOnly"
      :save-disabled="!canSave"
      :just-saved="justSaved"
      :on-save="save"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">{{ t('courseBuilderView.permissionDenied') }}</p>
    </div>

    <div v-else-if="isLoading" class="flex flex-1 items-center justify-center p-10">
      <StateLoading :noun="t('courseBuilderView.loadingNoun')" />
    </div>

    <div
      v-else-if="notFound"
      data-test="course-not-found"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-10"
    >
      <p class="text-ink-muted">{{ t('courseBuilderView.notFound') }}</p>
      <RouterLink :to="{ name: 'teacher-courses' }" class="text-sm font-semibold text-accent-text underline">
        {{ t('courseBuilderView.backToCourses') }}
      </RouterLink>
    </div>

    <div v-else-if="loadError" data-test="load-error" class="flex flex-1 items-center justify-center p-10">
      <StateError :message="t('courseBuilderView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <main
      v-else
      data-test="builder-body"
      class="flex min-w-0 flex-1 gap-8"
      :class="isCompact ? 'flex-col px-4 pb-6 pt-[20px]' : 'items-start px-[48px] pb-[80px] pt-10'"
    >
      <div class="flex min-w-0 flex-1 flex-col gap-6">
        <p
          v-if="readOnly"
          data-test="retired-notice"
          class="rounded-md border border-border bg-surface-sunken px-4 py-3 text-sm text-ink-muted"
        >
          {{ isAdmin ? t('courseBuilderView.retiredNoticeAdmin') : t('courseBuilderView.retiredNotice') }}
        </p>

        <div class="flex flex-col gap-1.5">
          <input
            v-model="form.title.value"
            data-test="course-title"
            type="text"
            :disabled="readOnly"
            :aria-label="t('courseBuilderView.titleLabel')"
            :placeholder="t('courseBuilderView.titlePlaceholder')"
            class="border-none bg-transparent font-bold text-ink outline-none disabled:cursor-not-allowed"
            :class="isCompact ? 'text-[1.375rem] leading-[1.75rem]' : 'text-xl'"
          />
          <span class="text-sm text-ink-subtle">{{ t('courseBuilderView.titleHint') }}</span>
        </div>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{{ t('courseBuilderView.summaryLabel') }}</span>
          <textarea
            v-model="form.summary.value"
            data-test="course-summary"
            rows="3"
            :disabled="readOnly"
            :placeholder="t('courseBuilderView.summaryPlaceholder')"
            class="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm disabled:cursor-not-allowed"
          />
        </label>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{{ t('courseBuilderView.levelLabel') }}</span>
          <LevelPicker
            v-model="form.level.value"
            :label="t('courseBuilderView.levelLabel')"
            :disabled="readOnly"
            class="w-fit"
          />
        </div>

        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{{ t('courseBuilderView.languageLabel') }}</span>
          <LanguageSelect
            v-model="form.language.value"
            data-test="course-language"
            :disabled="readOnly"
            class="w-fit"
          />
          <span class="text-sm text-ink-subtle">{{ t('courseBuilderView.languageHint') }}</span>
        </label>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{{ t('courseBuilderView.instrumentsLabel') }}</span>
          <InstrumentPicker v-model="form.instrumentIds.value" :disabled="readOnly" />
        </div>

        <div class="flex flex-col gap-2">
          <span class="text-sm font-semibold">{{ t('courseBuilderView.thumbnailLabel') }}</span>
          <ThumbnailField
            v-model="form.thumbnailUrl.value"
            :disabled="readOnly"
            @uploading="thumbnailUploading = $event"
          />
        </div>

        <div class="flex flex-col gap-3 border-t border-border pt-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">{{ t('courseBuilderView.checkpointsLabel') }}</span>
            <button
              v-if="!readOnly"
              type="button"
              data-test="add-checkpoint"
              class="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[0.8125rem] font-semibold text-accent-fg"
              @click="pickerOpen = true"
            >
              <Plus :size="14" aria-hidden="true" />
              {{ t('courseBuilderView.addCheckpoint') }}
            </button>
          </div>
          <CourseCheckpointList
            :checkpoints="form.checkpoints.value"
            :disabled="readOnly"
            @move="form.moveCheckpoint"
            @remove="form.removeCheckpoint"
            @update-override="onUpdateOverride"
          />
        </div>
      </div>

      <CourseStatusPanel
        v-if="savedCourse"
        :course="savedCourse"
        :is-admin="isAdmin"
        :publish-disabled="publishDisabled || !canSave"
        :busy="busy"
        :class="isCompact ? 'w-full' : 'w-72 shrink-0'"
        @publish="onPublish"
        @retire="onRetire"
        @reactivate="onReactivate"
        @show-outline="outlineOpen = true"
      />
    </main>

    <LearningPathPickerModal v-if="pickerOpen" :open="pickerOpen" @select="onPathPicked" @close="pickerOpen = false" />
    <PublishedCourseModal
      v-if="outlineOpen && savedCourse"
      :course-id="savedCourse.course_id"
      @close="outlineOpen = false"
    />
    <ConfirmDialog
      :open="leaveDialogOpen"
      :title="t('courseBuilderView.leaveTitle')"
      :message="t('courseBuilderView.leaveMessage')"
      :confirm-label="t('courseBuilderView.leaveConfirm')"
      @confirm="answerLeave(true)"
      @cancel="answerLeave(false)"
    />
  </div>
</template>
