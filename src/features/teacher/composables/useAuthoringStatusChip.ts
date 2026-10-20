import { useTypedT } from '@/shared/composables/useTypedT'

export interface StatusChipFace {
  label: string
  tone: 'neutral' | 'warning' | 'accent' | 'success'
}

/** The status chip of an item in a Teach list, in the words its editor's status panel uses. */
export function useAuthoringStatusChip() {
  const { t } = useTypedT()

  const draft = (): StatusChipFace => ({ label: t('authoringStatus.draft'), tone: 'accent' })
  const changed = (): StatusChipFace => ({ label: t('authoringStatus.unpublishedChanges'), tone: 'warning' })
  const published = (): StatusChipFace => ({ label: t('authoringStatus.published'), tone: 'success' })

  function lessonStatus(lesson: { latest_published_version?: number | null; has_unpublished_changes: boolean }): StatusChipFace {
    const version = lesson.latest_published_version ?? null
    if (version === null) return draft()
    if (lesson.has_unpublished_changes) return changed()
    return { label: t('authoringStatus.publishedVersion', { version }), tone: 'success' }
  }

  function pathStatus(path: { status: 'draft' | 'published' }): StatusChipFace {
    return path.status === 'published' ? published() : draft()
  }

  function courseStatus(course: { status: 'draft' | 'published' | 'retired'; has_unpublished_changes?: boolean }): StatusChipFace {
    if (course.status === 'retired') return { label: t('authoringStatus.retired'), tone: 'neutral' }
    if (course.status === 'draft') return draft()
    return course.has_unpublished_changes ? changed() : published()
  }

  return { lessonStatus, pathStatus, courseStatus }
}
