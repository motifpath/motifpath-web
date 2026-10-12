<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import ConfirmDialog from '@/shared/components/ConfirmDialog.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * Asks before an editor is left with unsaved changes: in the app through a dialog, and on closing
 * or reloading the tab through the browser's own prompt. Nothing is saved on the way out.
 */
const props = withDefaults(
  defineProps<{
    dirty: boolean
    /** What is lost, in the editor's own words. */
    message: string
    /** The question, when leaving loses more than edits ("Leave and cancel the upload?"). */
    title?: string
    /** The safe choice's label, with such a title. */
    keepLabel?: string
  }>(),
  { title: undefined, keepLabel: undefined },
)

const emit = defineEmits<{ leave: [] }>()

const { t } = useTypedT()

const open = ref(false)
let resolveLeave: ((leave: boolean) => void) | null = null

function answer(leave: boolean) {
  open.value = false
  if (leave) emit('leave')
  resolveLeave?.(leave)
  resolveLeave = null
}

onBeforeRouteLeave(() => {
  if (!props.dirty) return true
  open.value = true
  return new Promise<boolean>((resolve) => (resolveLeave = resolve))
})

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (props.dirty) event.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <ConfirmDialog
    :open="open"
    :title="title ?? t('unsavedChangesGuard.title')"
    :message="message"
    :confirm-label="t('unsavedChangesGuard.leave')"
    :cancel-label="keepLabel ?? t('unsavedChangesGuard.keepEditing')"
    @confirm="answer(true)"
    @cancel="answer(false)"
  />
</template>
