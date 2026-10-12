<script setup lang="ts">
import { Plus } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import CourseCheckpointList, { type CheckpointPathInfo } from '@/features/teacher/components/CourseCheckpointList.vue'
import CoursePreview from '@/features/teacher/components/CoursePreview.vue'
import CourseStatusPanel from '@/features/teacher/components/CourseStatusPanel.vue'
import LearningPathPickerModal from '@/features/teacher/components/LearningPathPickerModal.vue'
import ThumbnailField from '@/features/teacher/components/ThumbnailField.vue'
import {
  DraftLearningPathsError,
  useCourse,
  useCourseMutations,
  useCheckpointPaths,
} from '@/features/teacher/composables/useCourseAuthoring'
import { useCourseForm } from '@/features/teacher/composables/useCourseForm'
import AppButton from '@/shared/components/AppButton.vue'
import EditorAppBar from '@/shared/components/EditorAppBar.vue'
import EditorBody from '@/shared/components/EditorBody.vue'
import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'
import LanguageSelect from '@/shared/components/LanguageSelect.vue'
import LevelPicker from '@/shared/components/LevelPicker.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SaveBlockers from '@/shared/components/SaveBlockers.vue'
import UnsavedChangesGuard from '@/shared/components/UnsavedChangesGuard.vue'
import { useSaveBlockers } from '@/shared/composables/useSaveBlockers'
import { useSizeClass } from '@/shared/composables/useSizeClass'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'
import TeachShell from '@/shared/components/TeachShell.vue'

type Course = components['schemas']['Course']
type LearningPath = components['schemas']['LearningPath']

const currentUser = useCurrentUserStore()
const canAuthor = computed(
  () => currentUser.profile?.role === 'teacher' || currentUser.profile?.role === 'admin',
)
const isAdmin = computed(() => currentUser.profile?.role === 'admin')

const { sizeClass } = useSizeClass()
const isExpanded = computed(() => sizeClass.value === 'expanded')
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
// What the editor knows of each checkpoint's path, which a course doesn't carry.
const pathInfo = ref<Record<string, CheckpointPathInfo>>({})
function recordPath(path: LearningPath) {
  pathInfo.value = { ...pathInfo.value, [path.learning_path_id]: { status: path.status, lessonCount: path.items.length } }
}
const { lookUp: lookUpPaths } = useCheckpointPaths((learningPathId, path) => {
  form.setPathTitle(learningPathId, path.title)
  recordPath(path)
})

// The course as the server last described it, for its status and actions;
// null until a new course is first saved.
const savedCourse = ref<Course | null>(null)

function applySavedCourse(course: Course) {
  savedCourse.value = course
  form.loadFromCourse(course)
  void lookUpPaths([...new Set(form.checkpoints.value.map((checkpoint) => checkpoint.learningPathId))])
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

const saveState = computed(() => {
  if (saving.value) return 'saving'
  return form.isDirty.value || !savedCourse.value ? 'unsaved' : 'saved'
})

const missingLabels = computed(() => form.missing.value.map((field) => ({ field, label: t(`courseBuilderView.missing.${field}`) })))
const saveBlockers = useSaveBlockers(missingLabels)

async function onSave() {
  if (busy.value || thumbnailUploading.value || !saveBlockers.readyToSave()) return
  await save()
}

// What a publish needs beyond a save: every checkpoint's path published.
const missingToPublish = computed(() => [
  ...missingLabels.value.map((item) => item.label),
  ...form.checkpoints.value
    .filter((checkpoint) => pathInfo.value[checkpoint.learningPathId]?.status === 'draft')
    .map((checkpoint) => t('courseBuilderView.publishPathFirst', { title: checkpoint.pathTitle ?? '' })),
])

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
  toast.success(isUpdate ? t('courseBuilderView.courseSaved') : t('courseBuilderView.courseCreated'))
}

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

// Names the draft paths a refused publish points at, by the titles the
// author sees in the checkpoint list.
function draftPathsMessage(ids: string[]): string {
  const titles = ids.map((id) => {
    const checkpoint = form.checkpoints.value.find((c) => c.learningPathId === id)
    return checkpoint?.pathTitle || checkpoint?.override || id
  })
  return t('courseBuilderView.draftPathsBlockPublish', { titles: titles.join(', ') })
}

function onPublish() {
  void runAction(async () => {
    const course = await saveForm()
    if (!course) return
    const version = await publishCourse(course.course_id).catch((e: unknown) => {
      throw e instanceof DraftLearningPathsError ? new Error(draftPathsMessage(e.draftLearningPathIds)) : e
    })
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
const previewOpen = ref(false)

function onPathPicked(path: LearningPath) {
  pickerOpen.value = false
  recordPath(path)
  form.addCheckpoint(path)
}

function onUpdateOverride(index: number, value: string) {
  const checkpoint = form.checkpoints.value[index]
  if (checkpoint) checkpoint.override = value
}

const breadcrumbLabel = computed(() =>
  routeCourseId || savedCourse.value
    ? form.title.value || t('courseBuilderView.editBreadcrumb')
    : t('courseBuilderView.newBreadcrumb'),
)
const bodyReady = computed(() => !isLoading.value && !loadError.value)

const cardClass = 'flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4'
const eyebrowClass = 'text-xs font-semibold uppercase tracking-wider text-ink-muted'
const labelClass = 'text-sm font-semibold text-ink'
const hintClass = 'text-xs text-ink-muted'
const inputClass = 'h-12 rounded-xl border border-border bg-surface-sunken px-3 text-base text-ink disabled:cursor-not-allowed'
const textareaClass = 'rounded-xl border border-border bg-surface-sunken px-3 py-2 text-base text-ink disabled:cursor-not-allowed'
</script>

<template>
  <TeachShell section="teacher-courses" bar="none">
  <div class="flex flex-1 flex-col bg-surface">
    <EditorAppBar
      :compact="!isExpanded"
      :section-label="t('nav.courses')"
      :section-to="{ name: 'teacher-courses' }"
      :title="breadcrumbLabel"
      :save-state="saveState"
      :can-save="canAuthor && bodyReady && !notFound && !readOnly"
      @save="onSave"
    />

    <div v-if="!canAuthor" data-test="permission-denied" class="flex flex-1 items-center justify-center p-10">
      <p class="max-w-md text-center text-ink-muted">{{ t('courseBuilderView.permissionDenied') }}</p>
    </div>

    <div v-else-if="isLoading" class="flex flex-1 items-center justify-center p-10">
      <LoadingSkeleton />
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
      <LoadFailed :message="t('courseBuilderView.loadErrorMessage')" @retry="retryLoad" />
    </div>

    <EditorBody v-else data-test="builder-body" :two-columns="isExpanded">
      <template v-if="savedCourse" #side>
        <CourseStatusPanel
          :course="savedCourse"
          :is-admin="isAdmin"
          :missing="missingToPublish"
          :busy="busy"
          :has-unsaved-changes="form.isDirty.value"
          @publish="onPublish"
          @retire="onRetire"
          @reactivate="onReactivate"
          @preview="previewOpen = true"
        />
      </template>

      <SaveBlockers :items="saveBlockers.shown.value" :reveal="saveBlockers.reveal.value" />

      <section :class="cardClass">
        <h2 :class="eyebrowClass">{{ t('courseBuilderView.details') }}</h2>
        <label class="flex flex-col gap-1.5" data-field="title">
          <span :class="labelClass">{{ t('courseBuilderView.titleLabel') }}</span>
          <input
            v-model="form.title.value"
            data-test="course-title"
            type="text"
            :disabled="readOnly"
            :placeholder="t('courseBuilderView.titlePlaceholder')"
            :class="inputClass"
          />
          <span :class="hintClass">{{ t('courseBuilderView.titleHint') }}</span>
        </label>

        <label class="flex flex-col gap-1.5" data-field="summary">
          <span :class="labelClass">{{ t('courseBuilderView.summaryLabel') }}</span>
          <textarea
            v-model="form.summary.value"
            data-test="course-summary"
            rows="3"
            :disabled="readOnly"
            :placeholder="t('courseBuilderView.summaryPlaceholder')"
            :class="textareaClass"
          />
        </label>

        <div class="flex flex-col gap-1.5" data-field="level">
          <span :class="labelClass">{{ t('courseBuilderView.levelLabel') }}</span>
          <LevelPicker v-model="form.level.value" :label="t('courseBuilderView.levelLabel')" :disabled="readOnly" class="w-fit" />
        </div>

        <label class="flex flex-col gap-1.5" data-field="language">
          <span :class="labelClass">{{ t('courseBuilderView.languageLabel') }}</span>
          <LanguageSelect v-model="form.language.value" data-test="course-language" :disabled="readOnly" class="w-fit" />
          <span :class="hintClass">{{ t('courseBuilderView.languageHint') }}</span>
        </label>

        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('courseBuilderView.instrumentsLabel') }}</span>
          <InstrumentPicker v-model="form.instrumentIds.value" :disabled="readOnly" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span :class="labelClass">{{ t('courseBuilderView.thumbnailLabel') }}</span>
          <ThumbnailField v-model="form.thumbnailUrl.value" :disabled="readOnly" @uploading="thumbnailUploading = $event" />
        </div>
      </section>

      <section :class="cardClass" data-field="checkpoints">
        <div class="flex flex-col gap-1">
          <h2 :class="eyebrowClass">{{ t('courseBuilderView.checkpointsHeading', { count: form.checkpoints.value.length }) }}</h2>
          <p v-if="!readOnly && form.checkpoints.value.length > 1" :class="hintClass">{{ t('courseBuilderView.checkpointsHint') }}</p>
        </div>
        <CourseCheckpointList
          :checkpoints="form.checkpoints.value"
          :path-info="pathInfo"
          :disabled="readOnly"
          @move="form.moveCheckpoint"
          @remove="form.removeCheckpoint"
          @update-override="onUpdateOverride"
        />
        <AppButton v-if="!readOnly" data-test="add-checkpoint" variant="secondary" block @click="pickerOpen = true">
          <Plus :size="18" aria-hidden="true" />
          {{ t('courseBuilderView.addCheckpoint') }}
        </AppButton>
      </section>
    </EditorBody>

    <LearningPathPickerModal v-if="pickerOpen" :open="pickerOpen" @select="onPathPicked" @close="pickerOpen = false" />
    <CoursePreview v-if="previewOpen && savedCourse" :course-id="savedCourse.course_id" @close="previewOpen = false" />
    <UnsavedChangesGuard :dirty="form.isDirty.value && !readOnly" :message="t('courseBuilderView.leaveMessage')" />
  </div>
  </TeachShell>
</template>
