<script setup lang="ts">
import { computed } from 'vue'

import { conciergeWhatsAppUrl } from '@/features/student/utils/conciergeLink'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

const props = defineProps<{
  /** The typed short reference to what the student is looking at (see conciergeLink). */
  reference: string
  pathTitle?: string | null
  lessonTitle?: string | null
}>()

const { t } = useTypedT()
const currentUser = useCurrentUserStore()

// Read per render, not at module load, so the number is whatever this build
// was given — the feature is off when no number is configured.
const href = computed(() => {
  const name = currentUser.profile?.display_name?.trim()
  const lines = [
    name ? t('sendToTeacher.greetingNamed', { name }) : t('sendToTeacher.greeting'),
    props.pathTitle ? t('sendToTeacher.pathLine', { title: props.pathTitle }) : null,
    props.lessonTitle ? t('sendToTeacher.lessonLine', { title: props.lessonTitle }) : null,
    t('sendToTeacher.referenceLine', { reference: props.reference }),
    '',
    t('sendToTeacher.prompt'),
  ]
  const message = lines.filter((line): line is string => line !== null).join('\n')
  return conciergeWhatsAppUrl(import.meta.env.VITE_CONCIERGE_WHATSAPP_NUMBER, message)
})
</script>

<template>
  <div v-if="href" class="flex flex-col items-start gap-1">
    <a
      data-test="send-to-teacher"
      :href="href"
      target="_blank"
      rel="noopener noreferrer"
      class="rounded border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-sunken"
    >
      {{ t('sendToTeacher.button') }}
    </a>
    <p data-test="send-to-teacher-hint" class="text-xs text-ink-muted">{{ t('sendToTeacher.hint') }}</p>
  </div>
</template>
