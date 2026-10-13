<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import LearningCard from '@/features/student/components/LearningCard.vue'
import LearningItemMenu from '@/features/student/components/LearningItemMenu.vue'
import UpdateCopyDialog from '@/features/student/components/UpdateCopyDialog.vue'
import { useCourseCompletionRedirect } from '@/features/student/composables/useCourseCompletionRedirect'
import {
  LeaveFailedAfterSwitchError,
  useLeaveLearningItem,
} from '@/features/student/composables/useLeaveLearningItem'
import { useMyCourseEnrollments } from '@/features/student/composables/useMyCourseEnrollments'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { currentTargetOf, useMakeCurrentWithUndo } from '@/features/student/composables/useMakeCurrentWithUndo'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import type { UpdateResult } from '@/features/student/composables/useUpdateLearningItem'
import { completedCourseEnrollmentId } from '@/features/student/utils/courseCompletion'
import { buildLearning, nextInProgress, type LearningItem } from '@/features/student/utils/learning'
import AppButton from '@/shared/components/AppButton.vue'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

const { t } = useTypedT()
const toast = useToast()
const router = useRouter()

const enrollmentsState = useMyCourseEnrollments()
const standaloneState = useMyStandalonePaths()
// The current path only decides which row is current; having none yet ('no-path') is an ordinary
// state, not a failure.
const currentState = useStudentPath()
useCourseCompletionRedirect(() => completedCourseEnrollmentId(currentState.data.value))
const { switchTo } = useMakeCurrentWithUndo((view) => (currentState.data.value = view))
const { leave } = useLeaveLearningItem()

const isLoading = computed(
  () => enrollmentsState.isLoading.value || standaloneState.isLoading.value || currentState.isLoading.value,
)
const currentFailed = computed(() => currentState.error.value === 'load-failed')
const hasError = computed(() => enrollmentsState.error.value || standaloneState.error.value || currentFailed.value)

function retry() {
  if (enrollmentsState.error.value) void enrollmentsState.retry()
  if (standaloneState.error.value) void standaloneState.retry()
  if (currentFailed.value) void currentState.retry()
}

const groups = computed(() =>
  buildLearning(enrollmentsState.enrollments.value, standaloneState.paths.value, currentState.data.value),
)
const isEmpty = computed(
  () => enrollmentsState.enrollments.value.length === 0 && standaloneState.paths.value.length === 0,
)
const leftOpen = ref(false)

const switching = ref(false)

function openDetail(item: LearningItem) {
  void router.push(
    item.kind === 'course'
      ? { name: 'learning-course', params: { courseId: item.detailId } }
      : { name: 'learning-path', params: { learningPathId: item.detailId } },
  )
}

// The row is the action: it continues the item, making it current first when it isn't. Switching
// is reversible, so it happens at once with an Undo, never behind a confirm. A finished or left
// item has nothing to continue, so it opens its detail.
async function openItem(item: LearningItem) {
  if (item.state === 'finished' || item.state === 'left') return openDetail(item)
  if (item.state === 'current') return void router.push({ name: 'path' })
  if (switching.value) return

  switching.value = true
  try {
    await switchTo(item.target, item.title, currentTargetOf(currentState.data.value))
    void router.push({ name: 'path' })
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    switching.value = false
  }
}

// ── ⋯ and leaving ─────────────────────────────────────────────────────────

const menuItem = ref<LearningItem | null>(null)
const menuTrigger = ref<HTMLElement | null>(null)
const menuOpen = ref(false)

function openMenu(item: LearningItem, trigger: HTMLElement) {
  menuItem.value = item
  menuTrigger.value = trigger
  menuOpen.value = true
}

function menuDetails() {
  const item = menuItem.value
  menuOpen.value = false
  if (item) openDetail(item)
}

const leaving = ref<LearningItem | null>(null)
const leaveNext = computed(() => (leaving.value ? nextInProgress(groups.value, leaving.value) : null))
const leaveBusy = ref(false)

function menuLeave() {
  leaving.value = menuItem.value
  menuOpen.value = false
}

const leaveMessage = computed(() => {
  const item = leaving.value
  if (!item) return ''
  const message = item.kind === 'course' ? t('learningView.leaveCourseMessage') : t('learningView.removePathMessage')
  return item.state === 'current' && leaveNext.value
    ? `${message} ${t('learningView.continueWith', { title: leaveNext.value.title })}`
    : message
})

// The leave answers with what changed, so the list moves the row in place: reloading would swap
// the whole list for a skeleton and lose the scroll position and keyboard focus.
function applyLeft(result: Awaited<ReturnType<typeof leave>>) {
  const { enrollment, path } = result
  if (enrollment) {
    enrollmentsState.enrollments.value = enrollmentsState.enrollments.value.map((e) =>
      e.course_enrollment_id === enrollment.course_enrollment_id ? enrollment : e,
    )
  }
  if (path) {
    standaloneState.paths.value = standaloneState.paths.value.map((p) =>
      p.student_path_id === path.student_path_id ? path : p,
    )
  }
  if (result.current !== undefined) currentState.data.value = result.current
}

// ── Taking a newer version ────────────────────────────────────────────────

const updating = ref<LearningItem | null>(null)

function menuUpdate() {
  updating.value = menuItem.value
  menuOpen.value = false
}

// Like a leave, the update answers with the changed row, so it is put in place. It can't be
// undone, so the toast offers no Undo.
function applyUpdated(result: UpdateResult) {
  const { enrollment, path } = result
  updating.value = null
  if (enrollment) {
    enrollmentsState.enrollments.value = enrollmentsState.enrollments.value.map((e) =>
      e.course_enrollment_id === enrollment.course_enrollment_id ? enrollment : e,
    )
  }
  if (path) {
    standaloneState.paths.value = standaloneState.paths.value.map((p) =>
      p.student_path_id === path.student_path_id ? path : p,
    )
  }
  const title = enrollment?.course_title ?? path?.title
  if (title) toast.success(t('updateCopy.upToDate', { title }))
}

async function confirmLeave() {
  const item = leaving.value
  if (!item) return
  const next = leaveNext.value
  leaveBusy.value = true
  try {
    applyLeft(await leave(item, next))
  } catch (e) {
    if (e instanceof LeaveFailedAfterSwitchError) {
      currentState.data.value = e.current
      toast.error(t('learningView.leaveFailedAfterSwitch', { now: next?.title ?? '', title: item.title }))
    } else {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  } finally {
    leaveBusy.value = false
    leaving.value = null
  }
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <h1 class="text-xl font-semibold text-accent-text sm:text-2xl">{{ t('learningView.heading') }}</h1>

    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <LoadFailed v-else-if="hasError" data-test="error" :message="t('learningView.errorMessage')" @retry="retry" />

    <StateBlock
      v-else-if="isEmpty"
      data-test="empty"
      kind="empty"
      :title="t('learningView.emptyHeading')"
      :message="t('learningView.emptyMessage')"
    >
      <template #action>
        <AppButton :to="{ name: 'course-catalog' }" data-test="explore">
          {{ t('learningView.explore') }}
        </AppButton>
      </template>
    </StateBlock>

    <!-- One 560 px column; two would squeeze the titles. From a 1120 px window, where two fit beside
         the sidebar, the same rows in two columns — a list to manage, not a shelf to browse. -->
    <div v-else class="flex w-full max-w-[35rem] flex-col gap-6 min-[1120px]:max-w-[59.5rem]">
      <div
        v-if="!groups.inProgress.length"
        data-test="nothing-in-progress"
        class="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface-raised p-4"
      >
        <p class="text-base font-semibold text-ink">{{ t('learningView.nothingInProgress') }}</p>
        <RouterLink :to="{ name: 'course-catalog' }" class="text-sm font-semibold text-accent-text underline">
          {{ t('learningView.findNextCourse') }}
        </RouterLink>
      </div>

      <div v-if="groups.inProgress.length" data-test="learning-group-in-progress" class="flex flex-col gap-2">
        <SectionHeader :label="t('learningView.inProgress')" :count="String(groups.inProgress.length)" />
        <ul class="grid gap-3 min-[1120px]:grid-cols-2">
          <li v-for="item in groups.inProgress" :key="item.key">
            <LearningCard :item="item" @open="openItem(item)" @more="(trigger) => openMenu(item, trigger)" />
          </li>
        </ul>
      </div>

      <div v-if="groups.finished.length" data-test="learning-group-finished" class="flex flex-col gap-2">
        <SectionHeader :label="t('learningView.finished')" :count="String(groups.finished.length)" />
        <ul class="grid gap-3 min-[1120px]:grid-cols-2">
          <li v-for="item in groups.finished" :key="item.key">
            <LearningCard :item="item" @open="openItem(item)" @more="(trigger) => openMenu(item, trigger)" />
          </li>
        </ul>
      </div>

      <div v-if="groups.left.length" data-test="learning-group-left" class="flex flex-col gap-2">
        <SectionHeader
          :label="t('learningView.left')"
          :count="String(groups.left.length)"
          foldable
          :done="false"
          :expanded="leftOpen"
          @toggle="leftOpen = !leftOpen"
        />
        <ul v-if="leftOpen" class="grid gap-3 min-[1120px]:grid-cols-2">
          <li v-for="item in groups.left" :key="item.key">
            <LearningCard :item="item" @open="openItem(item)" @more="(trigger) => openMenu(item, trigger)" />
          </li>
        </ul>
      </div>
    </div>

    <LearningItemMenu
      :open="menuOpen"
      :item="menuItem"
      :trigger="menuTrigger"
      @close="menuOpen = false"
      @details="menuDetails"
      @leave="menuLeave"
      @update="menuUpdate"
    />

    <UpdateCopyDialog :item="updating" @updated="applyUpdated" @cancel="updating = null" />

    <ConfirmDialog
      :open="!!leaving"
      :title="
        leaving?.kind === 'path'
          ? t('learningView.removePathTitle', { title: leaving.title })
          : t('learningView.leaveCourseTitle', { title: leaving?.title ?? '' })
      "
      :message="leaveMessage"
      :confirm-label="leaving?.kind === 'path' ? t('learningView.removePathConfirm') : t('learningView.leaveCourseConfirm')"
      :busy="leaveBusy"
      @confirm="confirmLeave"
      @cancel="leaving = null"
    />
  </section>
</template>
