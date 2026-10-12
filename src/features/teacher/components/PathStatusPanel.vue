<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import StatusPanel from '@/shared/components/StatusPanel.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = withDefaults(
  defineProps<{
    status: 'draft' | 'published'
    /** Only an admin publishes and unpublishes paths. */
    isAdmin: boolean
    /** Whether an action is running. */
    busy: boolean
    /** What a publish still needs, as the author would add it. */
    missing?: string[]
  }>(),
  { missing: () => [] },
)
const emit = defineEmits<{ publish: []; unpublish: [] }>()

const { t } = useTypedT()

const isPublished = computed(() => props.status === 'published')

const statusChip = computed(() =>
  isPublished.value
    ? ({ label: t('authoringStatus.published'), tone: 'success' } as const)
    : ({ label: t('authoringStatus.draft'), tone: 'accent' } as const),
)

// A path has no versions: once published, every save reaches the next learner who starts it.
const message = computed(() => {
  if (isPublished.value) return t('pathStatusPanel.publishedMessage')
  const draft = t('authoringStatus.notPublishedYet')
  return props.isAdmin ? draft : `${draft} ${t('pathStatusPanel.adminPublishes')}`
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
      :missing="isAdmin && !isPublished ? missing : []"
      :primary="isAdmin && !isPublished ? t('authoringStatus.publish') : undefined"
      :secondary="isAdmin && isPublished ? t('pathBuilderView.unpublish') : undefined"
      :busy="busy"
      @primary="confirmOpen = true"
      @secondary="emit('unpublish')"
    />
    <ConfirmDialog
      :open="confirmOpen"
      :title="t('pathStatusPanel.publishTitle')"
      :message="t('pathStatusPanel.publishMessage')"
      :confirm-label="t('authoringStatus.publish')"
      :busy="busy"
      @confirm="onConfirm"
      @cancel="confirmOpen = false"
    />
  </div>
</template>
