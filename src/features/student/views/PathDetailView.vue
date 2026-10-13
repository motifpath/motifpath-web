<script setup lang="ts">
import { computed, ref } from 'vue'
import { type RouteLocationRaw, RouterLink, useRoute, useRouter } from 'vue-router'

import UpdateCopyDialog from '@/features/student/components/UpdateCopyDialog.vue'
import { useCatalogPath } from '@/features/student/composables/useCatalogPath'
import { useEnrollInLearningPath } from '@/features/student/composables/useEnrollInLearningPath'
import { useHeldStudentPath } from '@/features/student/composables/useHeldStudentPath'
import { currentTargetOf, useMakeCurrentWithUndo } from '@/features/student/composables/useMakeCurrentWithUndo'
import { useMyStandalonePaths } from '@/features/student/composables/useMyStandalonePaths'
import { useStudentPath } from '@/features/student/composables/useStudentPath'
import { discoverBackLink } from '@/features/student/utils/catalogReturn'
import type { UpdateResult } from '@/features/student/composables/useUpdateLearningItem'
import { buildLearning, type LearningItem } from '@/features/student/utils/learning'
import { groupPathSections } from '@/features/student/utils/groupPathSections'
import AppButton from '@/shared/components/AppButton.vue'
import InlineNotice from '@/shared/components/InlineNotice.vue'
import LoadFailed from '@/shared/components/LoadFailed.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import ProgressMeter from '@/shared/components/ProgressMeter.vue'
import SectionHeader from '@/shared/components/SectionHeader.vue'
import StateBlock from '@/shared/components/StateBlock.vue'
import StatusChip from '@/shared/components/StatusChip.vue'
import StepRow from '@/shared/components/StepRow.vue'
import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'
import { whereToStartReturn } from '@/features/student/utils/whereToStartReturn'

const route = useRoute()
const router = useRouter()
const { t } = useTypedT()
const toast = useToast()
const { instrumentsLabel } = useInstrumentNames()
const learningPathId = String(route.params.learningPathId)
const { path, isLoading, error, notFound, retry } = useCatalogPath(learningPathId)
const held = useMyStandalonePaths()
const { enrollInLearningPath } = useEnrollInLearningPath()
const currentState = useStudentPath()
const { switchTo, announceNowOn } = useMakeCurrentWithUndo((view) => (currentState.data.value = view))

// Opened from Learning, the way back is there; from a new student's Where to start, there;
// otherwise Discover, at the path the student came from.
const back = computed<{ title: string; label: string; to: RouteLocationRaw }>(() => {
  if (route.name === 'learning-path') {
    return { title: t('nav.learning'), label: t('pathDetailView.backToLearning'), to: { name: 'my-courses' } }
  }
  const whereToStart = whereToStartReturn(route.query)
  if (whereToStart) {
    return { title: t('firstRun.backToWhereToStart'), label: t('courseDetailView.backToWhereToStart'), to: whereToStart }
  }
  return { title: t('nav.discover'), label: t('courseDetailView.backToDiscover'), to: discoverBackLink('paths', learningPathId) }
})

// The learner's copy of this path, if they hold one: enrolling again reopens it, so the same action
// continues it.
const heldCopy = computed(() =>
  held.paths.value.find((p) => !p.archived_at && p.source_template_id === learningPathId) ?? null,
)
// A held copy with every lesson done is finished: its lessons open for review, from the student's
// own copy, and practice is the way on instead of continuing.
const finished = computed(() => {
  const copy = heldCopy.value
  return copy !== null && copy.lesson_count > 0 && copy.completed_count >= copy.lesson_count
})
const heldPathState = useHeldStudentPath(() => (finished.value ? (heldCopy.value?.student_path_id ?? null) : null))
const reviewSections = computed(() => {
  const view = heldPathState.view.value
  if (!view) return []
  return groupPathSections(view.items).map((section) => ({
    label: section.label,
    rows: section.items.map((item) => ({
      position: item.position,
      title: item.title,
      contentNodeId: item.content_node_id,
      meta: t('pathView.meta.done', { kind: t(`pathView.kind.${item.content_type}`) }),
      to: { name: 'review-lesson', params: { studentPathId: view.student_path_id, nodeId: item.content_node_id } },
    })),
  }))
})

// Lessons are numbered through the whole path, not per section.
const sections = computed(() => {
  let number = 0
  return groupPathSections(path.value?.items ?? []).map((section) => ({
    label: section.label,
    lessons: section.items.map((item) => ({ number: ++number, title: item.title })),
  }))
})

const chips = computed(() => {
  if (!path.value) return []
  const languageKey = languageLabelKey(path.value.language)
  return [
    t(`levels.${path.value.level}`),
    languageKey ? t(languageKey) : path.value.language,
    ...(path.value.instrument_ids.length ? [instrumentsLabel(path.value.instrument_ids)] : []),
  ]
})

const lessonCount = computed(() => t('courseCard.lessons', { count: path.value?.lesson_count ?? 0 }))

// The learner's own copy of this path, when they hold one in progress, and whether a newer version
// of it can be taken.
const heldItem = computed(
  () =>
    buildLearning([], held.paths.value, null).inProgress.find(
      (item) => item.detailId === learningPathId,
    ) ?? null,
)
const updating = ref<LearningItem | null>(null)

function applyUpdated(result: UpdateResult) {
  const updated = result.path
  updating.value = null
  if (!updated) return
  held.paths.value = held.paths.value.map((p) => (p.student_path_id === updated.student_path_id ? updated : p))
  toast.success(t('updateCopy.upToDate', { title: updated.title }))
}

const busy = ref(false)

/** Runs the primary action once at a time; a failure keeps the student on the detail. */
async function act(action: () => Promise<void>) {
  if (busy.value) return
  busy.value = true
  try {
    await action()
  } catch (e) {
    toast.error(e instanceof Error ? e.message : String(e))
  } finally {
    busy.value = false
  }
}

// Enrolling in a path always makes it current, so Start only says so, with an Undo back to what
// was current, and opens My path. It is reversible, so it doesn't ask first.
function start() {
  return act(async () => {
    if (!path.value) return
    const previous = currentTargetOf(currentState.data.value)
    await enrollInLearningPath(learningPathId)
    announceNowOn(path.value.title, previous)
    await router.push({ name: 'path' })
  })
}

// Continuing opens My path on this path, making it current first when it isn't.
function continuePath() {
  return act(async () => {
    const copy = heldCopy.value
    if (!copy || !path.value) return
    if (currentState.data.value?.student_path_id !== copy.student_path_id) {
      await switchTo({ studentPathId: copy.student_path_id }, path.value.title, currentTargetOf(currentState.data.value))
    }
    await router.push({ name: 'path' })
  })
}
</script>

<template>
  <section class="flex flex-col gap-4">
    <LoadingSkeleton v-if="isLoading" data-test="loading" />

    <template v-else-if="notFound">
      <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />
      <StateBlock
        data-test="not-found"
        kind="notFound"
        :title="t('pathDetailView.notFoundHeading')"
        :message="t('pathDetailView.notFoundMessage')"
      >
        <template #action>
          <RouterLink :to="{ name: 'path-catalog' }" class="text-sm font-semibold text-accent-text underline">
            {{ t('nav.findPath') }}
          </RouterLink>
        </template>
      </StateBlock>
    </template>

    <template v-else-if="error">
      <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />
      <LoadFailed data-test="error" :message="t('pathDetailView.errorMessage')" @retry="retry" />
    </template>

    <!-- The course detail's layout: one 560 px column on a phone and a tablet, in reading order.
         From a 1120 px window the outline takes a 600 px pane and the picture, size and action a
         320 px card that stays in view; the same elements, regrouped. -->
    <div
      v-else-if="path"
      class="flex w-full max-w-[35rem] flex-col gap-4 min-[1120px]:grid min-[1120px]:max-w-[59rem] min-[1120px]:grid-cols-[minmax(0,37.5rem)_20rem] min-[1120px]:items-start min-[1120px]:gap-x-6"
    >
      <div class="contents min-[1120px]:flex min-[1120px]:flex-col min-[1120px]:gap-4">
        <PageBackBar :title="back.title" :to="back.to" :back-label="back.label" />

        <div class="order-2 flex flex-col gap-2">
          <div class="flex flex-wrap gap-2">
            <StatusChip v-if="finished" data-test="finished-chip" tone="success" :label="t('courseDetailView.finished')" />
            <StatusChip v-else-if="heldCopy" data-test="in-learning-chip" tone="accent" :label="t('pathDetailView.inLearning')" />
            <StatusChip v-for="(chip, index) in chips" :key="index" data-test="path-chip" :label="chip" />
          </div>
          <h1 data-test="path-detail-title" class="text-xl font-semibold text-ink">{{ path.title }}</h1>
          <p data-test="path-detail-byline" class="text-xs">
            <RouterLink :to="{ name: 'path-catalog', query: { teacher: path.created_by.user_id } }" class="font-semibold text-accent-text underline">
              {{ t('courseCard.byline', { name: path.created_by.display_name }) }}
            </RouterLink>
          </p>
          <p data-test="path-detail-summary" class="text-base text-ink-muted">{{ path.summary }}</p>
        </div>

        <div v-if="finished" class="order-4 flex flex-col gap-3">
          <h2 data-test="outline-heading" class="text-lg font-semibold text-ink">{{ t('pathDetailView.reviewHeading') }}</h2>
          <LoadingSkeleton v-if="heldPathState.isLoading.value" data-test="lessons-loading" shape="lines" />
          <template v-else-if="heldPathState.error.value">
            <InlineNotice data-test="lessons-error" :message="t('courseDetailView.partsLoadFailed')" />
            <AppButton data-test="lessons-retry" variant="secondary" block @click="heldPathState.retry()">
              {{ t('buttons.tryAgain') }}
            </AppButton>
          </template>
          <div v-for="(section, sectionIndex) in reviewSections" v-else :key="sectionIndex" class="flex flex-col gap-1">
            <SectionHeader
              v-if="section.label"
              data-test="section-header"
              :label="section.label"
              :count="t('courseCard.lessons', { count: section.rows.length })"
            />
            <ul class="flex flex-col">
              <StepRow
                v-for="row in section.rows"
                :key="row.contentNodeId"
                data-test="review-lesson"
                state="done"
                :position="row.position"
                :title="row.title"
                :meta="row.meta"
                :to="row.to"
              />
            </ul>
          </div>
        </div>

        <div v-else-if="sections.length" class="order-4 flex flex-col gap-3">
          <h2 data-test="outline-heading" class="text-lg font-semibold text-ink">
            {{ t('pathDetailView.outlineHeading') }} · {{ lessonCount }}
          </h2>
          <!-- Outline items carry no id and titles can repeat, so their order is their identity.
               Titles only: a lesson opens from My path, not from here. -->
          <div v-for="(section, sectionIndex) in sections" :key="sectionIndex" data-test="outline-section" class="flex flex-col gap-1">
            <SectionHeader
              v-if="section.label"
              :label="section.label"
              :count="t('courseCard.lessons', { count: section.lessons.length })"
            />
            <ol class="flex flex-col">
              <li
                v-for="lesson in section.lessons"
                :key="lesson.number"
                data-test="outline-lesson"
                class="flex min-h-12 items-center gap-3 text-base text-ink"
              >
                <span class="w-5 shrink-0 text-right text-sm text-ink-muted">{{ lesson.number }}</span>
                <span class="min-w-0 flex-1">{{ lesson.title }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <div
        class="contents min-[1120px]:sticky min-[1120px]:top-5 min-[1120px]:flex min-[1120px]:flex-col min-[1120px]:gap-3 min-[1120px]:rounded-lg min-[1120px]:border min-[1120px]:border-border min-[1120px]:bg-surface-raised min-[1120px]:p-4"
      >
        <ThumbnailImage class="order-1" :url="path.thumbnail_url" fit="contain" size-class="aspect-video w-full rounded-lg" />

        <div class="order-3 flex flex-col gap-3">
          <p data-test="path-detail-lessons" class="hidden text-sm text-ink-muted min-[1120px]:block">{{ lessonCount }}</p>
          <div v-if="heldCopy" data-test="path-progress">
            <ProgressMeter
              :completed="heldCopy.completed_count"
              :total="heldCopy.lesson_count"
              :tone="finished ? 'success' : 'accent'"
              :label="t('learningCard.lessons', { completed: heldCopy.completed_count, count: heldCopy.lesson_count })"
              :summary="t('learningCard.lessonsSummary', { completed: heldCopy.completed_count, count: heldCopy.lesson_count })"
            />
          </div>

          <AppButton
            v-if="finished"
            data-test="practise"
            variant="secondary"
            block
            :to="{ name: 'practice-session' }"
          >
            {{ t('courseDetailView.practise') }}
          </AppButton>
          <AppButton v-else-if="heldCopy" data-test="continue" block :busy="busy" @click="continuePath">
            {{ t('pathDetailView.continue') }}
          </AppButton>
          <AppButton v-else data-test="start" block :busy="busy" @click="start">
            {{ t('pathDetailView.start') }}
          </AppButton>

          <div
            v-if="heldItem?.updateAvailable"
            data-test="update-card"
            class="flex flex-col items-start gap-2 rounded-lg bg-surface-sunken p-4"
          >
            <p class="text-sm font-semibold text-ink">{{ t('pathDetailView.newVersionHeading') }}</p>
            <p class="text-sm text-ink-muted">{{ t('pathDetailView.newVersionMessage') }}</p>
            <AppButton data-test="update-path" variant="secondary" block @click="updating = heldItem">
              {{ t('updateCopy.updatePath') }}
            </AppButton>
          </div>
        </div>
      </div>
    </div>

    <UpdateCopyDialog :item="updating" @updated="applyUpdated" @cancel="updating = null" />
  </section>
</template>
