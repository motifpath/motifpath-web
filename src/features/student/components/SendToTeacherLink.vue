<script setup lang="ts">
/**
 * "Send to your teacher" as a tertiary link, for a practice run: the Practice Shell keeps a run
 * free of floating controls, so it sits in the flow, under the options. Opens the same prefilled
 * WhatsApp message as the lesson's floating button.
 */
import { useId } from 'vue'

import WhatsAppIcon from '@/features/student/components/WhatsAppIcon.vue'
import { useSendToTeacherHref } from '@/features/student/composables/useSendToTeacherHref'
import { useTypedT } from '@/shared/composables/useTypedT'

const props = defineProps<{
  /** The typed short reference to what the student is looking at (see conciergeLink). */
  reference: string
  pathTitle?: string | null
  lessonTitle?: string | null
}>()

const { t } = useTypedT()
const hintId = useId()

// No link at all when no concierge number is configured.
const href = useSendToTeacherHref(props)
</script>

<template>
  <div v-if="href">
    <a
      data-test="send-to-teacher-link"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      :aria-describedby="hintId"
      class="inline-flex min-h-12 items-center gap-2 text-sm font-medium text-accent-text underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
    >
      <WhatsAppIcon class="h-5 w-5 text-whatsapp" />
      {{ t('sendToTeacher.button') }}
    </a>
    <span :id="hintId" class="sr-only">{{ t('sendToTeacher.hint') }}</span>
  </div>
</template>
