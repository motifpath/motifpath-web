import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const PUT = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { PUT }, eventApi: {} }),
}))

import { currentTargetOf, useMakeCurrentWithUndo } from '@/features/student/composables/useMakeCurrentWithUndo'
import { useToast } from '@/shared/composables/useToast'

const BLUES = { student_path_id: 'sp-blues', title: 'Blues basics · Part 1', course_enrollment_id: 'e-blues' }
const RHYTHM = { student_path_id: 'sp-rhythm', title: 'Reading rhythm', course_enrollment_id: null }

/** The composable as a component's setup runs it. */
function useInHost(onCurrent: Parameters<typeof useMakeCurrentWithUndo>[0]) {
  let result!: ReturnType<typeof useMakeCurrentWithUndo>
  mount(defineComponent({ setup: () => ((result = useMakeCurrentWithUndo(onCurrent)), () => null) }))
  return result
}

function answer(view: object) {
  PUT.mockResolvedValueOnce({ data: view, error: undefined, response: { status: 200 } })
}

const toast = useToast()
const shown = () => toast.toasts.value[0]

beforeEach(() => {
  PUT.mockReset()
  toast.clear()
})

describe('currentTargetOf', () => {
  it('names a course by its enrolment and a standalone path by its copy', () => {
    expect(currentTargetOf(BLUES)).toEqual({ courseEnrollmentId: 'e-blues' })
    expect(currentTargetOf(RHYTHM)).toEqual({ studentPathId: 'sp-rhythm' })
    expect(currentTargetOf(null)).toBeNull()
  })
})

describe('useMakeCurrentWithUndo', () => {
  it('switches, hands back the new current item, and says so with an Undo', async () => {
    const onCurrent = vi.fn()
    answer(BLUES)
    const { switchTo } = useInHost(onCurrent)

    await switchTo({ courseEnrollmentId: 'e-blues' }, 'Blues basics', { studentPathId: 'sp-rhythm' })

    expect(PUT).toHaveBeenCalledWith('/students/me/current-path', { body: { course_enrollment_id: 'e-blues' } })
    expect(onCurrent).toHaveBeenCalledWith(BLUES)
    expect(shown()).toMatchObject({ kind: 'neutral', message: 'Now on Blues basics', action: { label: 'Undo' } })
  })

  it('switches back on Undo', async () => {
    const onCurrent = vi.fn()
    answer(BLUES)
    const { switchTo } = useInHost(onCurrent)
    await switchTo({ courseEnrollmentId: 'e-blues' }, 'Blues basics', { studentPathId: 'sp-rhythm' })

    answer(RHYTHM)
    shown()!.action!.run()
    await flushPromises()

    expect(PUT).toHaveBeenLastCalledWith('/students/me/current-path', { body: { student_path_id: 'sp-rhythm' } })
    expect(onCurrent).toHaveBeenLastCalledWith(RHYTHM)
  })

  it('offers no Undo when nothing was current', async () => {
    answer(BLUES)
    const { switchTo } = useInHost(vi.fn())

    await switchTo({ courseEnrollmentId: 'e-blues' }, 'Blues basics', null)

    expect(shown()).toMatchObject({ message: 'Now on Blues basics' })
    expect(shown()!.action).toBeUndefined()
  })

  it('throws when the switch fails, saying nothing itself', async () => {
    PUT.mockResolvedValueOnce({ data: undefined, error: { status: 500 }, response: { status: 500 } })
    const { switchTo } = useInHost(vi.fn())

    await expect(switchTo({ courseEnrollmentId: 'e-blues' }, 'Blues basics', null)).rejects.toThrow()
    expect(shown()).toBeUndefined()
  })

  it('says so when Undo fails', async () => {
    answer(BLUES)
    const { switchTo } = useInHost(vi.fn())
    await switchTo({ courseEnrollmentId: 'e-blues' }, 'Blues basics', { studentPathId: 'sp-rhythm' })

    PUT.mockResolvedValueOnce({ data: undefined, error: { status: 500 }, response: { status: 500 } })
    shown()!.action!.run()
    await flushPromises()

    expect(shown()?.kind).toBe('error')
  })

  it('announces something the server already made current, with an Undo to what was', async () => {
    const onCurrent = vi.fn()
    const { announceNowOn } = useInHost(onCurrent)

    announceNowOn('Blues shuffle', { courseEnrollmentId: 'e-rhythm' })

    expect(PUT).not.toHaveBeenCalled()
    expect(shown()).toMatchObject({ message: 'Now on Blues shuffle', action: { label: 'Undo' } })

    answer(RHYTHM)
    shown()!.action!.run()
    await flushPromises()
    expect(PUT).toHaveBeenCalledWith('/students/me/current-path', { body: { course_enrollment_id: 'e-rhythm' } })
    expect(onCurrent).toHaveBeenCalledWith(RHYTHM)
  })
})
