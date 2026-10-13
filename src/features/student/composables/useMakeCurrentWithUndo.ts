import type { components } from '@/api/generated/core-domain'
import { type CurrentPathTarget, useSetCurrentPath } from '@/features/student/composables/useSetCurrentPath'
import { useToast } from '@/shared/composables/useToast'
import { useTypedT } from '@/shared/composables/useTypedT'

type StudentPathView = components['schemas']['StudentPathView']

/** What to switch back to: the current item's course enrolment, or its standalone path. */
export function currentTargetOf(
  view: Pick<StudentPathView, 'student_path_id' | 'course_enrollment_id'> | null,
): CurrentPathTarget | null {
  if (!view) return null
  return view.course_enrollment_id ? { courseEnrollmentId: view.course_enrollment_id } : { studentPathId: view.student_path_id }
}

/**
 * Making a course or path current, which is reversible, so it happens at once and says "Now on …"
 * with an Undo back to what was current. With nothing current before, there is nothing to go back
 * to, so there is no Undo. `onCurrent` hears each new current item, Undo's too.
 */
export function useMakeCurrentWithUndo(onCurrent: (view: StudentPathView) => void) {
  const { t } = useTypedT()
  const toast = useToast()
  const { setCurrentPath } = useSetCurrentPath()

  async function undo(previous: CurrentPathTarget) {
    try {
      onCurrent(await setCurrentPath(previous))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    }
  }

  /** Says the student is now on `title`, for something already made current. */
  function announceNowOn(title: string, previous: CurrentPathTarget | null) {
    toast.neutral(
      t('learningView.nowOn', { title }),
      previous ? { action: { label: t('learningView.undo'), run: () => void undo(previous) } } : {},
    )
  }

  /** Makes `target` current and says so; throws, saying nothing, when the switch fails. */
  async function switchTo(target: CurrentPathTarget, title: string, previous: CurrentPathTarget | null) {
    onCurrent(await setCurrentPath(target))
    announceNowOn(title, previous)
  }

  return { switchTo, announceNowOn }
}
