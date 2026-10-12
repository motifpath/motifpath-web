import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

const enrollments = {
  enrollments: ref<CourseEnrollment[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyCourseEnrollments', () => ({
  useMyCourseEnrollments: () => enrollments,
}))

const standalone = {
  paths: ref<StudentPath[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useMyStandalonePaths', () => ({
  useMyStandalonePaths: () => standalone,
}))

const current = {
  data: ref<StudentPathView | null>(null),
  error: ref<'no-path' | 'load-failed' | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useStudentPath', () => ({
  useStudentPath: () => current,
}))

const setCurrentPath = vi.fn()
vi.mock('@/features/student/composables/useSetCurrentPath', () => ({
  useSetCurrentPath: () => ({ setCurrentPath }),
}))

const { leave, LeaveFailedAfterSwitchError } = vi.hoisted(() => {
  class LeaveFailedAfterSwitchError extends Error {
    constructor(
      message: string,
      readonly current: unknown,
    ) {
      super(message)
    }
  }
  return { leave: vi.fn(), LeaveFailedAfterSwitchError }
})
vi.mock('@/features/student/composables/useLeaveLearningItem', () => ({
  useLeaveLearningItem: () => ({ leave }),
  LeaveFailedAfterSwitchError,
}))

const update = vi.fn()
vi.mock('@/features/student/composables/useUpdateLearningItem', () => ({
  useUpdateLearningItem: () => ({ update }),
}))

const toast = { success: vi.fn(), error: vi.fn(), neutral: vi.fn() }
vi.mock('@/shared/composables/useToast', () => ({
  useToast: () => toast,
}))

const push = vi.fn()
const replace = vi.fn()
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRouter: () => ({ push, replace }) }
})

import MyCoursesView from '@/features/student/views/MyCoursesView.vue'
import {
  makeCurrentPath as currentPath,
  makeEnrollment as enrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'

const guitar = enrollment({ course_enrollment_id: 'e-1', course_id: 'c-1', course_title: 'Guitar foundations', enrolled_at: '2026-09-01T00:00:00Z' })
const rhythm = enrollment({ course_enrollment_id: 'e-2', course_id: 'c-2', course_title: 'Reading rhythm', enrolled_at: '2026-09-03T00:00:00Z' })

function mountView() {
  return mount(MyCoursesView, { attachTo: document.body, global: { stubs: { RouterLink: RouterLinkStub } } })
}

function group(wrapper: ReturnType<typeof mountView>, name: 'in-progress' | 'finished' | 'left') {
  return wrapper.find(`[data-test="learning-group-${name}"]`)
}

function titlesIn(wrapper: ReturnType<typeof mountView>, name: 'in-progress' | 'finished' | 'left') {
  return group(wrapper, name)
    .findAll('[data-test="learning-title"]')
    .map((title) => title.text())
}

function row(wrapper: ReturnType<typeof mountView>, title: string) {
  const card = wrapper.findAll('[data-test="learning-card"]').find((c) => c.text().includes(title))
  if (!card) throw new Error(`no row titled ${title}`)
  return card
}

function inLayer(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`nothing matches ${selector}`)
  return element
}

async function chooseLeave(wrapper: ReturnType<typeof mountView>, title: string) {
  await row(wrapper, title).get('[data-test="learning-more"]').trigger('click')
  inLayer('[data-test="learning-menu-leave"]').click()
  await flushPromises()
}

describe('MyCoursesView', () => {
  beforeEach(() => {
    enrollments.enrollments.value = []
    enrollments.isLoading.value = false
    enrollments.error.value = false
    standalone.paths.value = []
    standalone.isLoading.value = false
    standalone.error.value = false
    current.data.value = null
    current.error.value = null
    current.isLoading.value = false
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('takes the student to the course-completed screen when this read finds their course just completed', () => {
    current.data.value = currentPath({ course_enrollment_id: 'e-1', course_completed: true })

    mountView()

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'e-1' } })
  })

  it('stays on Learning while the current course is in progress', () => {
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    mountView()

    expect(replace).not.toHaveBeenCalled()
  })

  it('is headed Learning', () => {
    expect(mountView().get('h1').text()).toBe('Learning')
  })

  // ── States ──────────────────────────────────────────────────────────────

  it('shows skeleton rows while anything is still loading', () => {
    standalone.isLoading.value = true

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows a notice in place of the list whose Try again reloads what failed', async () => {
    enrollments.error.value = true

    await mountView().get('[data-test="retry"]').trigger('click')

    expect(enrollments.retry).toHaveBeenCalled()
    expect(standalone.retry).not.toHaveBeenCalled()
  })

  it('still lists everything when the student has no current path yet', () => {
    current.error.value = 'no-path'
    enrollments.enrollments.value = [guitar]

    expect(titlesIn(mountView(), 'in-progress')).toEqual(['Guitar foundations'])
  })

  it('says nothing is here yet and points to Discover when the student has started nothing', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="empty"]').text()).toContain('Nothing here yet')
    const explore = wrapper.getComponent<typeof RouterLinkStub>('[data-test="explore"]')
    expect(explore.text()).toBe('Explore courses and paths')
    expect(explore.props('to')).toEqual({ name: 'course-catalog' })
  })

  it('puts a Nothing in progress card above Finished when everything is finished or left', () => {
    enrollments.enrollments.value = [enrollment({ status: 'completed' })]

    const wrapper = mountView()

    const card = wrapper.get('[data-test="nothing-in-progress"]')
    expect(card.text()).toContain('Nothing in progress')
    expect(card.getComponent<typeof RouterLinkStub>(RouterLinkStub).props('to')).toEqual({ name: 'course-catalog' })
    expect(group(wrapper, 'in-progress').exists()).toBe(false)
  })

  // ── The list ────────────────────────────────────────────────────────────

  it('groups courses and paths together under In progress, Finished and Left', async () => {
    enrollments.enrollments.value = [
      guitar,
      enrollment({ course_enrollment_id: 'e-3', course_title: 'First songs', status: 'completed' }),
      enrollment({ course_enrollment_id: 'e-4', course_title: 'Blues basics', status: 'abandoned' }),
    ]
    standalone.paths.value = [standalonePath({ title: 'Open chords' })]

    const wrapper = mountView()
    await group(wrapper, 'left').get('button').trigger('click')

    expect(titlesIn(wrapper, 'in-progress')).toEqual(['Guitar foundations', 'Open chords'])
    expect(titlesIn(wrapper, 'finished')).toEqual(['First songs'])
    expect(titlesIn(wrapper, 'left')).toEqual(['Blues basics'])
  })

  it('lists the current item first, then the most recently started', () => {
    enrollments.enrollments.value = [guitar, rhythm]
    standalone.paths.value = [standalonePath({ title: 'Open chords', assigned_at: '2026-09-02T00:00:00Z' })]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    expect(titlesIn(mountView(), 'in-progress')).toEqual(['Guitar foundations', 'Reading rhythm', 'Open chords'])
  })

  it('folds Left into one row with its count, with no done check', async () => {
    enrollments.enrollments.value = [
      enrollment({ course_enrollment_id: 'e-4', course_title: 'Blues basics', status: 'abandoned', enrolled_at: '2026-08-01T00:00:00Z' }),
      enrollment({ course_enrollment_id: 'e-5', course_title: 'Slide guitar', status: 'abandoned', enrolled_at: '2026-09-01T00:00:00Z' }),
    ]

    const wrapper = mountView()
    const toggle = group(wrapper, 'left').get('button')

    expect(toggle.text()).toContain('Left')
    expect(toggle.text()).toContain('2')
    expect(toggle.find('[data-test="section-done"]').exists()).toBe(false)
    expect(titlesIn(wrapper, 'left')).toEqual([])

    await toggle.trigger('click')

    expect(titlesIn(wrapper, 'left')).toEqual(['Slide guitar', 'Blues basics'])
  })

  // ── Tapping a row ───────────────────────────────────────────────────────

  it('opens My path on the current item, with no switch and no toast', async () => {
    enrollments.enrollments.value = [guitar]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    await row(mountView(), 'Guitar foundations').get('[data-test="learning-row"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(setCurrentPath).not.toHaveBeenCalled()
    expect(toast.neutral).not.toHaveBeenCalled()
  })

  it('makes another item in progress current, opens My path and offers Undo', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-2' }))

    await row(mountView(), 'Reading rhythm').get('[data-test="learning-row"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-2' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(toast.neutral).toHaveBeenCalledWith('Now on Reading rhythm', {
      action: { label: 'Undo', run: expect.any(Function) },
    })
  })

  it('switches back on Undo', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    setCurrentPath.mockResolvedValue(currentPath())

    await row(mountView(), 'Reading rhythm').get('[data-test="learning-row"]').trigger('click')
    await flushPromises()
    toast.neutral.mock.calls[0]?.[1].action.run()
    await flushPromises()

    expect(setCurrentPath).toHaveBeenLastCalledWith({ courseEnrollmentId: 'e-1' })
  })

  it('switches back to a standalone path on Undo', async () => {
    enrollments.enrollments.value = [rhythm]
    standalone.paths.value = [standalonePath({ student_path_id: 'sp-1' })]
    current.data.value = currentPath({ student_path_id: 'sp-1', course_enrollment_id: undefined })
    setCurrentPath.mockResolvedValue(currentPath())

    await row(mountView(), 'Reading rhythm').get('[data-test="learning-row"]').trigger('click')
    await flushPromises()
    toast.neutral.mock.calls[0]?.[1].action.run()
    await flushPromises()

    expect(setCurrentPath).toHaveBeenLastCalledWith({ studentPathId: 'sp-1' })
  })

  it('offers no Undo when nothing was current before', async () => {
    enrollments.enrollments.value = [rhythm]
    setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-2' }))

    await row(mountView(), 'Reading rhythm').get('[data-test="learning-row"]').trigger('click')
    await flushPromises()

    expect(toast.neutral).toHaveBeenCalledWith('Now on Reading rhythm', {})
  })

  it('reports a refused switch and stays on Learning', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    setCurrentPath.mockRejectedValueOnce(new Error('Could not switch'))

    await row(mountView(), 'Reading rhythm').get('[data-test="learning-row"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Could not switch')
    expect(push).not.toHaveBeenCalled()
  })

  it('opens the detail of a finished course', async () => {
    enrollments.enrollments.value = [enrollment({ course_id: 'c-7', course_title: 'First songs', status: 'completed' })]

    await row(mountView(), 'First songs').get('[data-test="learning-row"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'learning-course', params: { courseId: 'c-7' } })
    expect(setCurrentPath).not.toHaveBeenCalled()
  })

  it('opens the detail of a removed path, to start it again', async () => {
    standalone.paths.value = [standalonePath({ source_template_id: 'lp-7', archived_at: '2026-09-20T00:00:00Z' })]

    const wrapper = mountView()
    await group(wrapper, 'left').get('button').trigger('click')
    await row(wrapper, 'Open chords').get('[data-test="learning-row"]').trigger('click')

    expect(push).toHaveBeenCalledWith({ name: 'learning-path', params: { learningPathId: 'lp-7' } })
  })

  // ── The ⋯ menu and leaving ─────────────────────────────────────────────

  it("opens a course's details from its ⋯ menu", async () => {
    enrollments.enrollments.value = [rhythm]

    const wrapper = mountView()
    await row(wrapper, 'Reading rhythm').get('[data-test="learning-more"]').trigger('click')
    inLayer('[data-test="learning-menu-details"]').click()
    await flushPromises()

    expect(push).toHaveBeenCalledWith({ name: 'learning-course', params: { courseId: 'c-2' } })
  })

  it('asks before leaving a course, saying what is lost and what stays', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    await chooseLeave(mountView(), 'Reading rhythm')

    const dialog = inLayer('[role="alertdialog"]')
    expect(dialog.textContent).toContain('Leave Reading rhythm?')
    expect(dialog.textContent).toContain('You lose your place. Starting again begins at part 1. Your practice and skill levels stay.')
    expect(leave).not.toHaveBeenCalled()
  })

  it('moves a left course to Left, with no Undo', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    leave.mockResolvedValueOnce({ enrollment: { ...rhythm, status: 'abandoned' } })

    const wrapper = mountView()
    await chooseLeave(wrapper, 'Reading rhythm')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(leave).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reading rhythm' }), expect.objectContaining({ title: 'Guitar foundations' }))
    expect(titlesIn(wrapper, 'in-progress')).toEqual(['Guitar foundations'])
    expect(group(wrapper, 'left').text()).toContain('1')
    expect(toast.neutral).not.toHaveBeenCalled()
  })

  it('names the item that becomes current when leaving the current one', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    await chooseLeave(mountView(), 'Guitar foundations')

    expect(inLayer('[role="alertdialog"]').textContent).toContain("You'll continue with Reading rhythm.")
  })

  it('marks the next item current once the current one is left', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    leave.mockResolvedValueOnce({
      enrollment: { ...guitar, status: 'abandoned' },
      current: currentPath({ course_enrollment_id: 'e-2' }),
    })

    const wrapper = mountView()
    await chooseLeave(wrapper, 'Guitar foundations')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(row(wrapper, 'Reading rhythm').attributes('data-state')).toBe('current')
  })

  it('says where the student is when the leave fails after the switch', async () => {
    enrollments.enrollments.value = [guitar, rhythm]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })
    leave.mockRejectedValueOnce(new LeaveFailedAfterSwitchError('refused', currentPath({ course_enrollment_id: 'e-2' })))

    const wrapper = mountView()
    await chooseLeave(wrapper, 'Guitar foundations')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith("You're now on Reading rhythm, but Guitar foundations wasn't left. Try again.")
    expect(titlesIn(wrapper, 'in-progress')).toEqual(['Reading rhythm', 'Guitar foundations'])
  })

  it('reports a refused leave and keeps the item in progress', async () => {
    enrollments.enrollments.value = [rhythm]
    leave.mockRejectedValueOnce(new Error('Could not leave'))

    const wrapper = mountView()
    await chooseLeave(wrapper, 'Reading rhythm')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Could not leave')
    expect(titlesIn(wrapper, 'in-progress')).toEqual(['Reading rhythm'])
  })

  it('asks before removing a standalone path, in its own words', async () => {
    standalone.paths.value = [standalonePath({ title: 'Open chords' })]

    await chooseLeave(mountView(), 'Open chords')

    const dialog = inLayer('[role="alertdialog"]')
    expect(dialog.textContent).toContain('Remove Open chords?')
    expect(dialog.textContent).toContain('You lose your place in it. Your practice and skill levels stay.')
  })

  it('moves a removed path to Left', async () => {
    const openChords = standalonePath({ title: 'Open chords' })
    standalone.paths.value = [openChords]
    leave.mockResolvedValueOnce({ path: { ...openChords, archived_at: '2026-10-12T00:00:00Z' } })

    const wrapper = mountView()
    await chooseLeave(wrapper, 'Open chords')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(group(wrapper, 'in-progress').exists()).toBe(false)
    expect(group(wrapper, 'left').text()).toContain('1')
  })

  describe('updating to the latest version', () => {
    async function chooseUpdate(wrapper: ReturnType<typeof mountView>, title: string) {
      await row(wrapper, title).get('[data-test="learning-more"]').trigger('click')
      inLayer('[data-test="learning-menu-update"]').click()
      await flushPromises()
    }

    it('confirms first, then puts the updated course in its row with a success toast and no Undo', async () => {
      enrollments.enrollments.value = [{ ...guitar, update_available: true }]
      const updated = { ...guitar, update_available: false, course_thumbnail_url: 'https://cdn.example/new.png' }
      update.mockResolvedValueOnce({ enrollment: updated })
      const wrapper = mountView()
      await flushPromises()

      await chooseUpdate(wrapper, 'Guitar foundations')
      expect(inLayer('[role="alertdialog"]').textContent).toContain('Update Guitar foundations?')
      inLayer('[data-test="confirm-dialog-confirm"]').click()
      await flushPromises()

      expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Guitar foundations' }))
      expect(toast.success).toHaveBeenCalledWith('Guitar foundations is up to date')
      expect(row(wrapper, 'Guitar foundations').find('[data-test="learning-new-version"]').exists()).toBe(false)
      expect(document.querySelector('[role="alertdialog"]')).toBeNull()
      expect(setCurrentPath).not.toHaveBeenCalled()
    })

    it('leaves the row as it was on Not now', async () => {
      enrollments.enrollments.value = [{ ...guitar, update_available: true }]
      const wrapper = mountView()
      await flushPromises()

      await chooseUpdate(wrapper, 'Guitar foundations')
      inLayer('[data-test="confirm-dialog-cancel"]').click()
      await flushPromises()

      expect(update).not.toHaveBeenCalled()
      expect(row(wrapper, 'Guitar foundations').find('[data-test="learning-new-version"]').exists()).toBe(true)
    })

    it('puts an updated path in its row', async () => {
      const openChords = standalonePath({ student_path_id: 'sp-1', title: 'Open chords', update_available: true })
      standalone.paths.value = [openChords]
      update.mockResolvedValueOnce({ path: { ...openChords, update_available: false, lesson_count: 10 } })
      const wrapper = mountView()
      await flushPromises()

      await chooseUpdate(wrapper, 'Open chords')
      inLayer('[data-test="confirm-dialog-confirm"]').click()
      await flushPromises()

      expect(row(wrapper, 'Open chords').text()).toContain('5 of 10 lessons')
    })
  })
})
