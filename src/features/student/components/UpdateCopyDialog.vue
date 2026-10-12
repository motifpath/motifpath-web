<script setup lang="ts">
/**
 * Confirms taking the latest version of a course or path. The message is the same every time: a
 * list of what changed would mislead, since a moved or replaced lesson reads as one removed and one
 * added. It can't be undone, but nothing the student did is lost, so the confirm is not a danger.
 * A failure keeps the dialog open, saying nothing changed, with the confirm offering to try again.
 */
import { computed, ref, watch } from 'vue'

import { type UpdateResult, useUpdateLearningItem } from '@/features/student/composables/useUpdateLearningItem'
import type { LearningItem } from '@/features/student/utils/learning'
import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{ item: LearningItem | null }>()
const emit = defineEmits<{ updated: [result: UpdateResult, item: LearningItem]; cancel: [] }>()

const { t } = useTypedT()
const { update } = useUpdateLearningItem()

const busy = ref(false)
const failed = ref(false)
watch(
  () => props.item,
  () => {
    failed.value = false
  },
)

const isCourse = computed(() => props.item?.kind === 'course')
const confirmLabel = computed(() => {
  if (failed.value) return t('updateCopy.tryAgain')
  return isCourse.value ? t('updateCopy.updateCourse') : t('updateCopy.updatePath')
})

async function confirm() {
  const item = props.item
  if (!item || busy.value) return
  busy.value = true
  try {
    const result = await update(item)
    failed.value = false
    emit('updated', result, item)
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <ConfirmDialog
    :open="!!item"
    :title="t('updateCopy.title', { title: item?.title ?? '' })"
    :message="isCourse ? t('updateCopy.courseMessage') : t('updateCopy.pathMessage')"
    :confirm-label="confirmLabel"
    :cancel-label="t('updateCopy.notNow')"
    tone="primary"
    :busy="busy"
    :error="failed ? (isCourse ? t('updateCopy.courseFailed') : t('updateCopy.pathFailed')) : undefined"
    @confirm="confirm"
    @cancel="emit('cancel')"
  />
</template>
