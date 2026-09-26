<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Course = components['schemas']['Course']
type CourseAction = 'publish' | 'retire' | 'reactivate'

const props = defineProps<{
  course: Course
  /** Only an admin publishes, retires and reactivates courses. */
  isAdmin: boolean
  /** Whether there is nothing new to publish, or the form can't be saved first. */
  publishDisabled: boolean
  /** Whether an action is running. */
  busy: boolean
}>()
const emit = defineEmits<{ publish: []; retire: []; reactivate: []; showOutline: [] }>()

const { t } = useTypedT()

const statusLabel = computed(() => {
  const { status, latest_published_version: version } = props.course
  if (status === 'published' && version) return t('courseStatusPanel.publishedVersion', { version })
  return t(`courseStatus.${status}`)
})

const hasPublishedVersion = computed(() => !!props.course.latest_published_version)

// The action awaiting confirmation; it stays open while the confirmed action
// runs, and closes once it has finished.
const pending = ref<CourseAction | null>(null)
const confirmed = ref(false)

function ask(action: CourseAction) {
  pending.value = action
  confirmed.value = false
}

function onConfirm() {
  const action = pending.value
  if (!action) return
  confirmed.value = true
  if (action === 'publish') emit('publish')
  else if (action === 'retire') emit('retire')
  else emit('reactivate')
}

watch(
  () => props.busy,
  (busy) => {
    if (!busy && confirmed.value) {
      pending.value = null
      confirmed.value = false
    }
  },
)

const dialog = computed(() => {
  switch (pending.value) {
    case 'publish':
      return {
        title: t('courseStatusPanel.publishTitle'),
        message: t('courseStatusPanel.publishMessage'),
        confirmLabel: t('courseStatusPanel.publish'),
      }
    case 'retire':
      return {
        title: t('courseStatusPanel.retireTitle'),
        message: t('courseStatusPanel.retireMessage'),
        confirmLabel: t('courseStatusPanel.retire'),
      }
    case 'reactivate':
      return {
        title: t('courseStatusPanel.reactivateTitle'),
        message: t('courseStatusPanel.reactivateMessage'),
        confirmLabel: t('courseStatusPanel.reactivate'),
      }
    default:
      return null
  }
})
</script>

<template>
  <aside class="flex flex-col gap-4 rounded-lg border border-border bg-surface-raised p-4">
    <div class="flex flex-col gap-2">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-subtle">
        {{ t('courseStatusPanel.statusLabel') }}
      </span>
      <div class="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span data-test="course-status" class="rounded-full bg-accent-muted px-2.5 py-0.5 text-accent-text">
          {{ statusLabel }}
        </span>
        <span
          v-if="course.has_unpublished_changes"
          data-test="unpublished-changes"
          class="rounded-full border border-border px-2.5 py-0.5 text-ink-muted"
        >
          {{ t('courseListView.unpublishedChanges') }}
        </span>
      </div>
    </div>

    <button
      v-if="hasPublishedVersion"
      type="button"
      data-test="show-outline"
      class="w-fit text-sm font-semibold text-accent-text underline"
      @click="emit('showOutline')"
    >
      {{ t('courseStatusPanel.showOutline') }}
    </button>

    <div v-if="isAdmin" class="flex flex-wrap gap-2">
      <button
        v-if="course.status !== 'retired'"
        type="button"
        data-test="publish-course"
        :disabled="publishDisabled || busy"
        class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        @click="ask('publish')"
      >
        {{ t('courseStatusPanel.publish') }}
      </button>
      <button
        v-if="course.status === 'published'"
        type="button"
        data-test="retire-course"
        :disabled="busy"
        class="rounded-md border border-border bg-surface-raised px-3.5 py-2 text-[0.8125rem] font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        @click="ask('retire')"
      >
        {{ t('courseStatusPanel.retire') }}
      </button>
      <button
        v-if="course.status === 'retired'"
        type="button"
        data-test="reactivate-course"
        :disabled="busy"
        class="rounded-md bg-accent px-3.5 py-2 text-[0.8125rem] font-semibold text-accent-fg disabled:cursor-not-allowed disabled:opacity-60"
        @click="ask('reactivate')"
      >
        {{ t('courseStatusPanel.reactivate') }}
      </button>
    </div>
    <p v-else data-test="admin-publishes-note" class="text-sm text-ink-subtle">
      {{ t('courseStatusPanel.adminPublishesNote') }}
    </p>

    <ConfirmDialog
      :open="dialog !== null"
      :title="dialog?.title ?? ''"
      :message="dialog?.message ?? ''"
      :confirm-label="dialog?.confirmLabel ?? ''"
      :busy="busy"
      @confirm="onConfirm"
      @cancel="pending = null"
    />
  </aside>
</template>
