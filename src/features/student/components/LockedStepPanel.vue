<script setup lang="ts">
import { computed } from 'vue'

import { useStepWording } from '@/features/student/composables/useStepWording'
import type { MyPathStep } from '@/features/student/utils/myPath'
import OverlayPanel from '@/shared/components/OverlayPanel.vue'
import PrimaryButton from '@/shared/components/PrimaryButton.vue'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** The locked step the student tapped; null while the panel is closed. */
  step: MyPathStep | null
  /** The step the student can do now, the way forward from a step locked behind it. */
  next: MyPathStep | null
}>()
const emit = defineEmits<{ close: [] }>()

const { t } = useTypedT()
const wording = useStepWording()

/** Why the step is locked and the one way forward: open it in its language, or go to the step that opens it. */
const content = computed(() => {
  const { step, next } = props
  if (!step) return null
  if (step.state === 'language') {
    const name = wording.language(step)?.name ?? ''
    return {
      title: t('pathView.language.title', { ownLanguage: wording.ownLanguage() }),
      message: t(`pathView.language.message.${step.kind}`, { language: name }),
      action: wording.startAction(step),
    }
  }
  return {
    title: t('pathView.locked.title', { position: step.position }),
    message: next ? t('pathView.locked.message', { current: next.position, title: next.title }) : '',
    // The lesson itself explains a language lock, so going there never picks a language for the student.
    action: next
      ? { label: t('pathView.locked.action', { current: next.position }), to: { name: 'node', params: { nodeId: next.contentNodeId } } }
      : null,
  }
})
</script>

<template>
  <OverlayPanel :open="content !== null" :title="content?.title ?? ''" @close="emit('close')">
    <p class="text-base text-ink-muted">{{ content?.message }}</p>
    <template v-if="content?.action" #actions>
      <PrimaryButton as="RouterLink" :to="content.action.to" data-test="locked-step-action" class="w-full">
        {{ content.action.label }}
      </PrimaryButton>
    </template>
  </OverlayPanel>
</template>
