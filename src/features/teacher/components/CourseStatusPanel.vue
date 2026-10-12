<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'

import type { components } from '@/api/generated/core-domain'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import StatusPanel from '@/shared/components/StatusPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

type Course = components['schemas']['Course']
type CourseAction = 'publish' | 'retire' | 'reactivate'

const props = withDefaults(
  defineProps<{
    course: Course
    /** Only an admin publishes, retires and reactivates courses. */
    isAdmin: boolean
    /** Whether an action is running. */
    busy: boolean
    /**
     * Whether the form holds edits not yet saved. Publishing saves them first; a retired course
     * can't be edited, so retiring waits until they are saved.
     */
    hasUnsavedChanges?: boolean
    /** What a publish still needs, as the author would add it. */
    missing?: string[]
  }>(),
  { hasUnsavedChanges: false, missing: () => [] },
)
const emit = defineEmits<{ publish: []; retire: []; reactivate: []; preview: [] }>()

const { t } = useTypedT()

const version = computed(() => props.course.latest_published_version ?? null)
const isRetired = computed(() => props.course.status === 'retired')
const isPublished = computed(() => props.course.status === 'published' && version.value !== null)
const hasChanges = computed(() => props.course.has_unpublished_changes || props.hasUnsavedChanges)

const statusChip = computed(() => {
  if (isRetired.value) return { label: t('authoringStatus.retired'), tone: 'neutral' } as const
  if (!isPublished.value) return { label: t('authoringStatus.draft'), tone: 'accent' } as const
  if (props.course.has_unpublished_changes) return { label: t('authoringStatus.unpublishedChanges'), tone: 'warning' } as const
  return { label: t('authoringStatus.publishedVersion', { version: version.value }), tone: 'success' } as const
})

const message = computed(() => {
  if (isRetired.value) return props.isAdmin ? t('courseStatusPanel.retiredMessageAdmin') : t('courseStatusPanel.retiredMessage')
  const now = learnersGetNow()
  if (props.isAdmin) return now
  return isPublished.value && !props.course.has_unpublished_changes ? now : `${now} ${t('courseStatusPanel.adminPublishes')}`
})

function learnersGetNow(): string {
  if (!isPublished.value) return t('authoringStatus.notPublishedYet')
  if (!props.course.has_unpublished_changes) return t('authoringStatus.learnersGet', { version: version.value })
  const stillGet = t('authoringStatus.learnersStillGet', { version: version.value })
  return props.isAdmin ? `${stillGet} ${t('authoringStatus.publishToGiveThem')}` : stillGet
}

const primary = computed<{ label: string; action: CourseAction } | null>(() => {
  if (!props.isAdmin) return null
  if (isRetired.value) return { label: t('courseStatusPanel.reactivate'), action: 'reactivate' }
  if (!isPublished.value) return { label: t('authoringStatus.publish'), action: 'publish' }
  return hasChanges.value ? { label: t('authoringStatus.publishChanges'), action: 'publish' } : null
})

const canRetire = computed(() => props.isAdmin && isPublished.value && !isRetired.value)

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
  if (!pending.value) return null
  return {
    title: t(`courseStatusPanel.${pending.value}Title`),
    message: t(`courseStatusPanel.${pending.value}Message`),
    confirmLabel: t(`courseStatusPanel.${pending.value}`),
  }
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <StatusPanel
      :status="statusChip"
      :message="message"
      :missing="primary?.action === 'publish' ? missing : []"
      :primary="primary?.label"
      :secondary="canRetire && !hasUnsavedChanges ? t('courseStatusPanel.retire') : undefined"
      :busy="busy"
      @primary="primary && ask(primary.action)"
      @secondary="ask('retire')"
    >
      <p v-if="canRetire && hasUnsavedChanges" data-test="retire-needs-save" class="text-sm text-ink-muted">
        {{ t('courseStatusPanel.retireNeedsSave') }}
      </p>
    </StatusPanel>

    <button
      v-if="version !== null"
      type="button"
      data-test="see-what-learners-see"
      class="flex h-10 items-center gap-2 self-start rounded-full px-1 text-sm font-semibold text-accent-text hover:underline"
      @click="emit('preview')"
    >
      <Eye :size="18" aria-hidden="true" />{{ t('authoringStatus.seeWhatLearnersSee') }}
    </button>

    <ConfirmDialog
      :open="dialog !== null"
      :title="dialog?.title ?? ''"
      :message="dialog?.message ?? ''"
      :confirm-label="dialog?.confirmLabel ?? ''"
      :busy="busy"
      @confirm="onConfirm"
      @cancel="pending = null"
    />
  </div>
</template>
