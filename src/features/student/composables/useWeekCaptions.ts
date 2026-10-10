import { computed, type Ref } from 'vue'

import type { thisWeek } from '@/features/student/utils/studentHome'
import { useTypedT } from '@/shared/composables/useTypedT'

type Week = ReturnType<typeof thisWeek>

/**
 * The captions under This week's tiles, the same on the home and on Your progress. Only a gain is
 * worded as one; a quieter week is stated plainly, and a streak is always shown kindly: with none
 * running, the tile invites one and keeps the best, and never says a streak was lost.
 */
export function useWeekCaptions(week: Ref<Week | null>) {
  const { t } = useTypedT()

  const minutes = computed(() => {
    if (!week.value) return undefined
    const { minutes, minutesChange } = week.value
    if (minutesChange > 0) return t('studentHome.week.minutesMore', { count: minutesChange })
    if (minutesChange < 0) return t('studentHome.week.minutesFewer', { count: -minutesChange })
    return minutes > 0 ? t('studentHome.week.minutesSame') : undefined
  })

  const streak = computed(() => {
    if (!week.value) return undefined
    const { streak, bestStreak } = week.value
    if (streak > 0) return t('studentHome.week.best', { count: bestStreak })
    return bestStreak > 0 ? t('studentHome.week.startStreak', { count: bestStreak }) : t('studentHome.week.startFirstStreak')
  })

  const songs = computed(() =>
    week.value && week.value.songsThisWeek > 0 ? t('studentHome.week.songsThisWeek', { count: week.value.songsThisWeek }) : undefined,
  )

  const skillsUp = computed(() => (week.value && week.value.skillsUp > 0 ? t('studentHome.week.skillsUpThisWeek') : undefined))

  return { minutes, streak, songs, skillsUp }
}
