import type { DiagramKindChoice, DiagramShowsChoice } from '@/features/teacher/utils/authoringListQuery'
import type { MessageKey } from '@/i18n'
import { useTypedT } from '@/shared/composables/useTypedT'
import { languageLabelKey } from '@/shared/utils/languageLabels'

const TYPE_LABELS: Record<string, MessageKey> = {
  image_recognition: 'common.exerciseTypes.image_recognition',
  image_choice: 'common.exerciseTypes.image_choice',
  audio_recognition: 'common.exerciseTypes.audio_recognition',
  audio_selection: 'common.exerciseTypes.audio_selection',
  text_response: 'common.exerciseTypes.text_response',
  video: 'common.contentTypes.video',
  article: 'common.contentTypes.article',
}

const LEVEL_LABELS: Record<string, MessageKey> = {
  beginner: 'levels.beginner',
  early_intermediate: 'levels.early_intermediate',
  intermediate: 'levels.intermediate',
  advanced: 'levels.advanced',
  expert: 'levels.expert',
}

/** The words for a Teach list's filter values, the same in the filters and in the applied chips. */
export function useAuthoringFilterLabels() {
  const { t } = useTypedT()

  function labelOf(keys: Record<string, MessageKey>, value: string): string {
    const key = keys[value]
    return key ? t(key) : value
  }

  return {
    typeLabel: (type: string) => labelOf(TYPE_LABELS, type),
    levelLabel: (level: string) => labelOf(LEVEL_LABELS, level),
    kindLabel: (kind: DiagramKindChoice) => t(`authoringFilters.kind.${kind}`),
    showsLabel: (shows: DiagramShowsChoice) => t(`authoringFilters.shows.${shows}`),
    rootLabel: (note: string) => t('authoringList.rootChip', { note }),
    languageLabel: (code: string) => {
      const key = languageLabelKey(code)
      return key ? t(key) : code
    },
  }
}
