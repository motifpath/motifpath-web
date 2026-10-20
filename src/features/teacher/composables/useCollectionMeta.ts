import { useAuthoringFilterLabels } from '@/features/teacher/composables/useAuthoringFilterLabels'
import { useInstrumentNames } from '@/shared/composables/useInstrumentNames'
import { useTypedT } from '@/shared/composables/useTypedT'

/**
 * The meta line of a path or a course in a Teach list: its level, language, instruments and how
 * many lessons it has ("Beginner · English · Guitar · 44 lessons"), leaving out what it lacks.
 */
export function useCollectionMeta() {
  const { t, locale } = useTypedT()
  const { levelLabel, languageLabel } = useAuthoringFilterLabels()
  const { instrumentsLabel } = useInstrumentNames()

  return function collectionMeta(item: {
    level?: string
    language?: string
    instrument_ids: string[]
    lessonCount: number
  }): string {
    const lessons = t('authoringList.count.lessons', {
      count: item.lessonCount,
      shown: new Intl.NumberFormat(locale.value).format(item.lessonCount),
    })
    return [
      item.level ? levelLabel(item.level) : '',
      item.language ? languageLabel(item.language) : '',
      instrumentsLabel(item.instrument_ids),
      lessons,
    ]
      .filter((part) => part !== '')
      .join(' · ')
  }
}
