<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import StatusPanel from '@/shared/components/StatusPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    latestPublishedVersion: number | null
    /** Saved edits that no published version has yet. */
    hasUnpublishedChanges: boolean
    /** Edits not saved yet; publishing saves them first. */
    hasUnsavedChanges?: boolean
    /** Only the lesson's author or an admin publishes it. */
    canPublish: boolean
    /** Whether an action is running. */
    busy: boolean
    /** What a publish still needs, as the author would add it. */
    missing?: string[]
  }>(),
  { hasUnsavedChanges: false, missing: () => [] },
)
const emit = defineEmits<{ publish: [] }>()

const { t } = useTypedT()

const version = computed(() => props.latestPublishedVersion)

const statusChip = computed(() => {
  if (version.value === null) return { label: t('authoringStatus.draft'), tone: 'accent' } as const
  if (props.hasUnpublishedChanges) return { label: t('authoringStatus.unpublishedChanges'), tone: 'warning' } as const
  return { label: t('authoringStatus.publishedVersion', { version: version.value }), tone: 'success' } as const
})

const message = computed(() => {
  const now = learnersGetNow()
  return props.canPublish ? now : `${now} ${t('lessonStatusPanel.authorPublishes')}`
})

function learnersGetNow(): string {
  if (version.value === null) return t('authoringStatus.notPublishedYet')
  if (!props.hasUnpublishedChanges) return t('authoringStatus.learnersGet', { version: version.value })
  const stillGet = t('authoringStatus.learnersStillGet', { version: version.value })
  return props.canPublish ? `${stillGet} ${t('authoringStatus.publishToGiveThem')}` : stillGet
}

const primary = computed(() => {
  if (!props.canPublish) return undefined
  if (version.value === null) return t('authoringStatus.publish')
  return props.hasUnpublishedChanges || props.hasUnsavedChanges ? t('authoringStatus.publishChanges') : undefined
})

const confirmOpen = ref(false)
const confirmed = ref(false)

function onConfirm() {
  confirmed.value = true
  emit('publish')
}

// The question stays open while the publish runs, and closes once it has finished.
watch(
  () => props.busy,
  (busy) => {
    if (!busy && confirmed.value) {
      confirmOpen.value = false
      confirmed.value = false
    }
  },
)
</script>

<template>
  <div>
    <StatusPanel
      :status="statusChip"
      :message="message"
      :missing="primary ? missing : []"
      :primary="primary"
      :busy="busy"
      @primary="confirmOpen = true"
    />
    <ConfirmDialog
      :open="confirmOpen"
      :title="t('lessonStatusPanel.publishTitle')"
      :message="t('lessonStatusPanel.publishMessage')"
      :confirm-label="t('authoringStatus.publish')"
      :busy="busy"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
