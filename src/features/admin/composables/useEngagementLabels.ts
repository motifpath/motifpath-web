import type { components } from '@/api/generated/core-domain'
import { alphaDay, lastActive, weekChip } from '@/features/admin/utils/alphaObservation'
import { useTypedT } from '@/shared/composables/useTypedT'

type AlphaStudent = components['schemas']['AlphaStudent']

export type ChipTone = 'danger' | 'warning' | 'success'

/** The words the engagement screens put on a student's numbers, in the viewer's language. */
export function useEngagementLabels() {
  const { t, locale } = useTypedT()

  function chip(countedSessions: number): { label: string; tone: ChipTone } {
    const chipKind = weekChip(countedSessions)
    if (chipKind.kind === 'none') return { label: t('engagement.chip.none'), tone: 'danger' }
    if (chipKind.kind === 'toGo') return { label: t('engagement.chip.toGo', { count: chipKind.remaining }), tone: 'warning' }
    return { label: t('engagement.chip.onTarget'), tone: 'success' }
  }

  /** "Today", "Yesterday", "9 days ago": a row's last-active column. */
  function lastActiveShort(student: AlphaStudent, now: Date): string {
    const active = lastActive(student.last_active_at, now)
    if (active.kind === 'none') return t('engagement.lastActive.none')
    if (active.kind === 'today') return t('engagement.lastActive.today')
    if (active.days === 1) return t('engagement.lastActive.yesterday')
    return t('engagement.lastActive.daysAgo', { count: active.days })
  }

  /** "today at 07:51", "9 days ago": last activity inside a sentence. */
  function lastActiveInline(student: AlphaStudent, now: Date): string {
    const active = lastActive(student.last_active_at, now)
    if (active.kind === 'none') return t('engagement.lastActive.none').toLowerCase()
    if (active.kind === 'today') return t('engagement.lastActive.todayAt', { time: active.time })
    return t('engagement.lastActive.daysAgo', { count: active.days })
  }

  function joined(student: AlphaStudent): string {
    return t('engagement.student.joined', { date: alphaDay(student.registered_at, locale.value) })
  }

  function weeksAtTarget(student: AlphaStudent): string {
    if (student.weeks_so_far_count === 0) return t('engagement.student.noWeeksYet')
    return t('engagement.student.weeksAtTarget', { count: student.weeks_at_target_count, total: student.weeks_so_far_count })
  }

  return { t, locale, chip, lastActiveShort, lastActiveInline, joined, weeksAtTarget }
}
