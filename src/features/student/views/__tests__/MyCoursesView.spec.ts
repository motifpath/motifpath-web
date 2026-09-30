import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const toast = { success: vi.fn(), error: vi.fn() }
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

const alice = { user_id: 'st-1', display_name: 'Alice Souza' }

function enrollment(overrides: Partial<CourseEnrollment> = {}): CourseEnrollment {
  return {
    course_enrollment_id: 'e-1',
    student: alice,
    course_id: 'c-1',
    course_title: 'Fingerstyle journey',
    course_summary: 'From first arpeggios to full arrangements.',
    course_level: 'beginner',
    course_created_by: { user_id: 't-1', display_name: 'Bob Martins' },
    course_version_number: 1,
    checkpoint_count: 3,
    status: 'active',
    active_checkpoint_student_path_id: 'sp-e1',
    active_checkpoint_position: 2,
    enrolled_at: '2026-09-02T00:00:00Z',
    ...overrides,
  }
}

function standalonePath(overrides: Partial<StudentPath> = {}): StudentPath {
  return {
    student_path_id: 'sp-1',
    student: alice,
    source_template_id: 'lp-1',
    title: 'Open chords warm-up',
    assigned_by: { user_id: 't-1', display_name: 'Bob Martins' },
    assigned_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    source_course_enrollment_id: null,
    course_checkpoint_position: null,
    lesson_count: 0,
    completed_count: 0,
    ...overrides,
  }
}

function currentPath(overrides: Partial<StudentPathView>): StudentPathView {
  return {
    student_path_id: 'sp-e1',
    source_template_id: 'lp-e1',
    title: 'Stage 2',
    course_enrollment_id: 'e-1',
    course_checkpoint_position: 2,
    current_position: 1,
    items: [],
    course_completed: false,
    ...overrides,
  }
}

function mountView() {
  return mount(MyCoursesView, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function card(wrapper: ReturnType<typeof mountView>, title: string) {
  const match = wrapper
    .findAll('[data-test="my-course-item"]')
    .find((c) => c.text().includes(title))
  if (!match) throw new Error(`no card titled ${title}`)
  return match
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

  it('takes the student to the course-completed screen when this read finds their course just completed', () => {
    current.data.value = currentPath({ course_enrollment_id: 'e-1', course_completed: true })

    mountView()

    expect(replace).toHaveBeenCalledWith({ name: 'course-completed', params: { enrollmentId: 'e-1' } })
  })

  it('stays on My courses while the current course is in progress', () => {
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    mountView()

    expect(replace).not.toHaveBeenCalled()
  })

  it('shows a loading state while anything is still loading', () => {
    standalone.isLoading.value = true

    expect(mountView().find('[data-test="loading"]').exists()).toBe(true)
  })

  it('shows an error state whose retry reloads everything that failed', async () => {
    enrollments.error.value = true

    await mountView().get('[data-test="retry"]').trigger('click')

    expect(enrollments.retry).toHaveBeenCalled()
  })

  it('still lists everything when the student has no current path yet', () => {
    current.error.value = 'no-path'
    enrollments.enrollments.value = [enrollment()]

    const wrapper = mountView()

    expect(wrapper.find('[data-test="error"]').exists()).toBe(false)
    expect(card(wrapper, 'Fingerstyle journey').find('[data-test="switch"]').exists()).toBe(true)
  })

  it('is headed My learning', () => {
    expect(mountView().get('h1').text()).toBe('My learning')
  })

  it('points a student with no courses or paths to both catalogs', () => {
    const empty = mountView().get('[data-test="empty"]')

    expect(empty.findAllComponents(RouterLinkStub).map((l: { props: (key: string) => unknown }) => l.props('to'))).toEqual([
      { name: 'course-catalog' },
      { name: 'path-catalog' },
    ])
  })

  it('always offers a way to find another course or a path', () => {
    enrollments.enrollments.value = [enrollment()]

    const links = mountView().findAllComponents(RouterLinkStub)

    expect(links.map((l) => l.props('to'))).toContainEqual({ name: 'course-catalog' })
    expect(links.map((l) => l.props('to'))).toContainEqual({ name: 'path-catalog' })
  })

  it('shows each standalone path on the shared card, labeled as a path, with its lesson progress', () => {
    standalone.paths.value = [
      standalonePath({
        summary: 'Five chords, cleanly.',
        level: 'beginner',
        created_by: { user_id: 't-2', display_name: 'Carol Dias' },
        thumbnail_url: 'https://cdn.test/open-chords.png',
        lesson_count: 4,
        completed_count: 1,
      }),
    ]

    const pathCard = card(mountView(), 'Open chords warm-up')

    expect(pathCard.get('[data-test="course-card-label"]').text()).toBe('Path')
    expect(pathCard.text()).toContain('Five chords, cleanly.')
    expect(pathCard.get('[data-test="course-byline"]').text()).toContain('Carol Dias')
    expect(pathCard.get('[data-test="course-level"]').text()).toBe('Beginner')
    expect(pathCard.get('img').attributes('src')).toBe('https://cdn.test/open-chords.png')
    expect(pathCard.get('[data-test="path-progress"]').text()).toBe('1 of 4 lessons')
  })

  it('says who assigned a path, but not when the learner enrolled themselves', () => {
    standalone.paths.value = [
      standalonePath(),
      standalonePath({ student_path_id: 'sp-2', title: 'Self-picked', assigned_by: alice }),
    ]

    const wrapper = mountView()

    expect(card(wrapper, 'Open chords warm-up').text()).toContain('Assigned by Bob Martins')
    expect(card(wrapper, 'Self-picked').text()).not.toContain('Assigned by')
  })

  it('offers to open the current course or path', () => {
    enrollments.enrollments.value = [enrollment()]
    standalone.paths.value = [standalonePath()]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    const wrapper = mountView()

    const open = card(wrapper, 'Fingerstyle journey').get('[data-test="open"]')
    expect(open.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'path' })
    expect(card(wrapper, 'Open chords warm-up').find('[data-test="open"]').exists()).toBe(false)
  })

  it('lists each course enrollment with its learning-path progress and status', () => {
    enrollments.enrollments.value = [
      enrollment(),
      enrollment({
        course_enrollment_id: 'e-2',
        course_title: 'Jazz voicings',
        status: 'completed',
      }),
      enrollment({
        course_enrollment_id: 'e-3',
        course_title: 'Blues basics',
        status: 'abandoned',
      }),
    ]

    const wrapper = mountView()

    expect(card(wrapper, 'Fingerstyle journey').text()).toContain('Learning path 2 of 3')
    expect(card(wrapper, 'Jazz voicings').text()).toContain('Completed')
    expect(card(wrapper, 'Blues basics').text()).toContain('Left')
  })

  it('shows the presentation pinned to the enrollment version', () => {
    enrollments.enrollments.value = [enrollment()]

    const pinned = card(mountView(), 'Fingerstyle journey')

    expect(pinned.text()).toContain('From first arpeggios to full arrangements.')
    expect(pinned.text()).toContain('Bob Martins')
    expect(pinned.text()).toContain('Beginner')
    expect(pinned.text()).toContain('3 learning paths')
  })

  it('keeps legacy enrollments usable while their presentation metadata is unavailable', () => {
    const legacyEnrollment = enrollment() as unknown as Record<string, unknown>
    delete legacyEnrollment.course_created_by
    delete legacyEnrollment.checkpoint_count
    enrollments.enrollments.value = [legacyEnrollment as unknown as CourseEnrollment]

    const legacyCard = card(mountView(), 'Fingerstyle journey')

    expect(legacyCard.find('[data-test="course-byline"]').exists()).toBe(false)
    expect(legacyCard.find('[data-test="course-checkpoints"]').exists()).toBe(false)
  })

  it("shows the thumbnail of the course version each enrollment is on, and a placeholder for standalone paths", () => {
    enrollments.enrollments.value = [
      enrollment({ course_thumbnail_url: 'https://cdn.test/thumbnails/v2.png' }),
      enrollment({ course_enrollment_id: 'e-2', course_title: 'Jazz voicings' }),
    ]
    standalone.paths.value = [standalonePath({ title: 'Warm-ups' })]

    const wrapper = mountView()

    expect(card(wrapper, 'Fingerstyle journey').get('img').attributes('src')).toBe('https://cdn.test/thumbnails/v2.png')
    expect(card(wrapper, 'Jazz voicings').find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
    expect(card(wrapper, 'Warm-ups').find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
  })

  it('offers to switch only to active enrollments', () => {
    enrollments.enrollments.value = [
      enrollment(),
      enrollment({
        course_enrollment_id: 'e-2',
        course_title: 'Jazz voicings',
        status: 'completed',
      }),
    ]

    const wrapper = mountView()

    expect(card(wrapper, 'Fingerstyle journey').find('[data-test="switch"]').exists()).toBe(true)
    expect(card(wrapper, 'Jazz voicings').find('[data-test="switch"]').exists()).toBe(false)
  })

  it('marks the current course as current instead of offering to switch to it', () => {
    enrollments.enrollments.value = [
      enrollment(),
      enrollment({ course_enrollment_id: 'e-2', course_title: 'Jazz voicings' }),
    ]
    current.data.value = currentPath({ course_enrollment_id: 'e-1' })

    const wrapper = mountView()

    const currentCard = card(wrapper, 'Fingerstyle journey')
    expect(currentCard.find('[data-test="current"]').exists()).toBe(true)
    expect(currentCard.find('[data-test="switch"]').exists()).toBe(false)
    expect(card(wrapper, 'Jazz voicings').find('[data-test="switch"]').exists()).toBe(true)
  })

  it('marks the current standalone path as current, with a way to open it', () => {
    standalone.paths.value = [standalonePath()]
    current.data.value = currentPath({ student_path_id: 'sp-1', course_enrollment_id: null })

    const currentCard = card(mountView(), 'Open chords warm-up')
    expect(currentCard.find('[data-test="current"]').exists()).toBe(true)
    expect(currentCard.find('[data-test="open"]').exists()).toBe(true)
    expect(currentCard.find('[data-test="switch"]').exists()).toBe(false)
  })

  it('lists archived paths apart, without a switch action', () => {
    standalone.paths.value = [
      standalonePath(),
      standalonePath({
        student_path_id: 'sp-2',
        title: 'Old scales',
        archived_at: '2026-09-10T00:00:00Z',
      }),
    ]

    const wrapper = mountView()

    const archived = wrapper.get('[data-test="archived-paths"]')
    expect(archived.text()).toContain('Old scales')
    expect(archived.find('[data-test="switch"]').exists()).toBe(false)
    expect(card(wrapper, 'Open chords warm-up').find('[data-test="switch"]').exists()).toBe(true)
  })

  it('switches to a course and opens its path', async () => {
    enrollments.enrollments.value = [enrollment()]
    setCurrentPath.mockResolvedValueOnce(currentPath({}))
    const wrapper = mountView()

    await card(wrapper, 'Fingerstyle journey').get('[data-test="switch"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-1' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('switches to a standalone path and opens it', async () => {
    standalone.paths.value = [standalonePath()]
    setCurrentPath.mockResolvedValueOnce(
      currentPath({ student_path_id: 'sp-1', course_enrollment_id: null }),
    )
    const wrapper = mountView()

    await card(wrapper, 'Open chords warm-up').get('[data-test="switch"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ studentPathId: 'sp-1' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('disables every switch while one is in flight', async () => {
    enrollments.enrollments.value = [enrollment()]
    standalone.paths.value = [standalonePath()]
    setCurrentPath.mockReturnValueOnce(new Promise(() => {}))
    const wrapper = mountView()

    await card(wrapper, 'Fingerstyle journey').get('[data-test="switch"]').trigger('click')

    for (const button of wrapper.findAll('[data-test="switch"]')) {
      expect(button.attributes('disabled')).toBeDefined()
    }
  })

  it('reports a refused switch and stays on the page', async () => {
    enrollments.enrollments.value = [enrollment()]
    setCurrentPath.mockRejectedValueOnce(new Error('That course is no longer active'))
    const wrapper = mountView()

    await card(wrapper, 'Fingerstyle journey').get('[data-test="switch"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('That course is no longer active')
    expect(push).not.toHaveBeenCalled()
    expect(
      card(wrapper, 'Fingerstyle journey').get('[data-test="switch"]').attributes('disabled'),
    ).toBeUndefined()
  })
})
