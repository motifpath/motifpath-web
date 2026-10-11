import { computed, type ComputedRef } from 'vue'

import { conciergeNumber, conciergeWhatsAppUrl } from '@/features/student/utils/conciergeLink'
import { useTypedT } from '@/shared/composables/useTypedT'
import { useCurrentUserStore } from '@/stores/currentUser'

export interface SendToTeacherContext {
  /** The typed short reference to what the student is looking at (see conciergeLink). */
  reference: string
  pathTitle?: string | null
  lessonTitle?: string | null
}

/**
 * The wa.me link that opens a WhatsApp message to the concierge, prefilled with who is writing
 * and what they are looking at; null when no concierge number is configured.
 */
export function useSendToTeacherHref(context: SendToTeacherContext): ComputedRef<string | null> {
  const { t } = useTypedT()
  const currentUser = useCurrentUserStore()

  return computed(() => {
    const name = currentUser.profile?.display_name?.trim()
    const lines = [
      name ? t('sendToTeacher.greetingNamed', { name }) : t('sendToTeacher.greeting'),
      context.pathTitle ? t('sendToTeacher.pathLine', { title: context.pathTitle }) : null,
      context.lessonTitle ? t('sendToTeacher.lessonLine', { title: context.lessonTitle }) : null,
      t('sendToTeacher.referenceLine', { reference: context.reference }),
      '',
      t('sendToTeacher.prompt'),
    ]
    const message = lines.filter((line): line is string => line !== null).join('\n')
    return conciergeWhatsAppUrl(conciergeNumber(), message)
  })
}
