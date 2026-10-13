import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type CourseDetail = components['schemas']['CourseDetail']
type CourseEnrollment = components['schemas']['CourseEnrollment']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']
type StudentPathItem = components['schemas']['StudentPathItem']

const published = {
  course: ref<CourseDetail | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/usePublishedCourse', () => ({
  usePublishedCourse: () => published,
}))

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

const parts = {
  parts: ref<StudentPathView[]>([]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
const useEnrollmentParts = vi.fn<(enrollmentId: () => string | null) => typeof parts>(() => parts)
vi.mock('@/features/student/composables/useEnrollmentParts', () => ({
  useEnrollmentParts: (enrollmentId: () => string | null) => useEnrollmentParts(enrollmentId),
}))

const enrollInCourse = vi.fn()
vi.mock('@/features/student/composables/useEnrollInCourse', () => ({
  useEnrollInCourse: () => ({ enrollInCourse }),
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

vi.mock('@/shared/composables/useInstrumentNames', () => ({
  useInstrumentNames: () => ({
    instrumentsLabel: (ids: string[]) => ids.map((id) => (id === 'inst-guitar' ? 'Guitar' : '…')).join(', '),
  }),
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
const route = {
  name: 'learning-course',
  params: { courseId: 'c-1' },
  query: {} as Record<string, string>,
}
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return {
    ...actual,
    useRoute: () => route,
    useRouter: () => ({ push }),
  }
})

import { saveCatalogReturn } from '@/features/student/utils/catalogReturn'
import PageBackBar from '@/shared/components/PageBackBar.vue'
import {
  makeCurrentPath as currentPath,
  makeEnrollment as enrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'
import CourseDetailView from '@/features/student/views/CourseDetailView.vue'

function titles(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({ title: `${prefix} ${index + 1}` }))
}

function course(overrides: Partial<CourseDetail> = {}): CourseDetail {
  return {
    course_id: 'c-1',
    title: 'Guitar foundations',
    summary: 'Chords, strumming and your first songs, one part at a time.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 't-1', display_name: 'Ana Souza' },
    status: 'published',
    published_at: '2026-09-01T00:00:00Z',
    thumbnail_url: undefined,
    checkpoint_count: 4,
    lesson_count: 44,
    instrument_ids: ['inst-guitar'],
    checkpoints: [
      { position: 1, title: 'Open chords', items: titles('Open', 12) },
      { position: 2, title: 'Major triads', items: titles('Triad', 14) },
      { position: 3, title: 'Seventh chords', items: titles('Seventh', 10) },
      { position: 4, title: 'Accompany a song', items: titles('Song', 8) },
    ],
    ...overrides,
  }
}

function pathItems(done: number, count: number): StudentPathItem[] {
  return Array.from({ length: count }, (_, index) => ({
    position: index + 1,
    content_node_id: `n-${index + 1}`,
    content_node_version_id: `v-${index + 1}`,
    title: `Triad ${index + 1}`,
    content_type: 'video',
    status: index < done ? 'completed' : index === done ? 'in_progress' : 'locked',
  }))
}

/** A finished part as the student took it: every lesson done. */
function finishedPart(position: number, title: string, lessons: string[]): StudentPathView {
  return {
    student_path_id: `part-${position}`,
    source_template_id: `path-${position}`,
    title,
    course_enrollment_id: 'e-1',
    course_checkpoint_position: position,
    current_position: lessons.length,
    course_completed: false,
    items: lessons.map((lesson, index) => ({
      position: index + 1,
      content_node_id: `p${position}-n${index + 1}`,
      content_node_version_id: `p${position}-v${index + 1}`,
      title: lesson,
      content_type: index % 2 === 0 ? 'video' : 'article',
      status: 'completed',
    })),
  }
}

const fourFinishedParts = [
  finishedPart(1, 'Open chords', ['E minor', 'A minor', 'D major']),
  finishedPart(2, 'Major triads', ['Root position', 'Inversions']),
  finishedPart(3, 'Seventh chords', ['Dominant sevenths']),
  finishedPart(4, 'Accompany a song', ['Strumming along']),
]

function mountView() {
  return mount(CourseDetailView, { attachTo: document.body, global: { stubs: { RouterLink: RouterLinkStub } } })
}

// Overlays open on <body>, outside the view.
function inLayer(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`nothing matches ${selector}`)
  return element
}

function partStates(wrapper: ReturnType<typeof mountView>) {
  return wrapper.findAll('[data-test="part-row"]').map((row) => row.attributes('data-state'))
}

describe('CourseDetailView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  beforeEach(() => {
    vi.clearAllMocks()
    route.name = 'learning-course'
    route.query = {}
    published.course.value = course()
    published.isLoading.value = false
    published.error.value = false
    published.notFound.value = false
    enrollments.enrollments.value = []
    enrollments.isLoading.value = false
    enrollments.error.value = false
    standalone.paths.value = []
    current.data.value = null
    current.error.value = 'no-path'
    parts.parts.value = fourFinishedParts
    parts.isLoading.value = false
    parts.error.value = false
  })

  // ── The way back ────────────────────────────────────────────────────────

  it('goes back to Learning when opened from Learning', () => {
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('title')).toBe('Learning')
    expect(back.props('to')).toEqual({ name: 'my-courses' })
  })

  it('goes back to Discover, with its search and filters, when opened from it', () => {
    route.name = 'course-detail'
    route.query = {}
    saveCatalogReturn('courses', { itemId: 'c-1', query: { q: 'blues', level: ['beginner'] }, loadedCount: 20, scrollY: 0 })
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('title')).toBe('Discover')
    expect(back.props('to')).toEqual({
      name: 'course-catalog',
      query: { q: 'blues', level: ['beginner'], returnFromCourse: 'c-1' },
    })
  })

  it('goes back to a fresh Discover when not opened from it', () => {
    route.name = 'course-detail'
    route.query = {}
    window.localStorage.clear()
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('to')).toEqual({ name: 'course-catalog' })
  })

  it('leads back to Where to start, with the same answers, when opened from it', () => {
    route.name = 'course-detail'
    route.query = { startInstrument: 'inst-guitar', startExperience: 'plays_a_bit' }
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('title')).toBe('Where to start')
    expect(back.props('to')).toEqual({
      name: 'home',
      query: { instrument: 'inst-guitar', experience: 'plays_a_bit' },
    })
  })

  // ── The top ─────────────────────────────────────────────────────────────

  it('shows the course’s chips, title, author and summary', () => {
    const wrapper = mountView()

    expect(wrapper.findAll('[data-test="course-chip"]').map((chip) => chip.text())).toEqual([
      'Beginner',
      'English',
      'Guitar',
    ])
    expect(wrapper.get('[data-test="course-detail-title"]').text()).toBe('Guitar foundations')
    expect(wrapper.get('[data-test="course-detail-byline"]').text()).toBe('by Ana Souza')
    expect(wrapper.get('[data-test="course-detail-summary"]').text()).toContain('one part at a time')
  })

  it('opens Discover on courses filtered by the teacher from the byline', () => {
    const byline = mountView().get('[data-test="course-detail-byline"]')

    expect(byline.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'course-catalog',
      query: { teacher: course().created_by.user_id },
    })
  })

  it('shows the whole course picture, never cropped', () => {
    published.course.value = { ...course(), thumbnail_url: 'https://cdn.example/t.png' }

    expect(mountView().get('img').classes()).toContain('object-contain')
  })

  it('renders a legacy course with no author', () => {
    const legacy = course() as unknown as Record<string, unknown>
    delete legacy.created_by
    published.course.value = legacy as unknown as CourseDetail

    const wrapper = mountView()
    expect(wrapper.get('[data-test="course-detail-title"]').text()).toBe('Guitar foundations')
    expect(wrapper.find('[data-test="course-detail-byline"]').exists()).toBe(false)
  })

  // ── Enrolled ────────────────────────────────────────────────────────────

  it('offers to continue the part of an enrolled course, and nothing else as primary', () => {
    enrollments.enrollments.value = [enrollment()]
    const wrapper = mountView()

    expect(wrapper.get('[data-test="course-progress"]').text()).toContain('Part 2 of 4')
    expect(wrapper.get('[data-test="continue"]').text()).toBe('Continue part 2')
    expect(wrapper.find('[data-test="start"]').exists()).toBe(false)
  })

  it('offers a newer version in a quiet card under Continue', () => {
    enrollments.enrollments.value = [enrollment({ update_available: true })]
    const wrapper = mountView()

    const card = wrapper.get('[data-test="update-card"]')
    expect(card.text()).toContain('A newer version is available')
    expect(card.get('[data-test="update-course"]').text()).toBe('Update course')
  })

  it('has no update card when the course is up to date', () => {
    enrollments.enrollments.value = [enrollment()]

    expect(mountView().find('[data-test="update-card"]').exists()).toBe(false)
  })

  it('updates through the same confirm, then drops the card with a success toast', async () => {
    enrollments.enrollments.value = [enrollment({ update_available: true })]
    update.mockResolvedValueOnce({ enrollment: enrollment({ update_available: false, course_version_number: 2 }) })
    const wrapper = mountView()

    await wrapper.get('[data-test="update-course"]').trigger('click')
    expect(inLayer('[role="alertdialog"]').textContent).toContain('Update Guitar foundations?')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(toast.success).toHaveBeenCalledWith('Guitar foundations is up to date')
    expect(wrapper.find('[data-test="update-card"]').exists()).toBe(false)
  })

  it('makes the course current, with an Undo, then opens My path', async () => {
    enrollments.enrollments.value = [enrollment(), enrollment({ course_enrollment_id: 'e-2', course_id: 'c-2' })]
    current.data.value = currentPath({ course_enrollment_id: 'e-2', student_path_id: 'sp-e2' })
    current.error.value = null
    setCurrentPath.mockResolvedValueOnce(currentPath())
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-1' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
    const [message, options] = toast.neutral.mock.calls[0] ?? []
    expect(message).toBe('Now on Guitar foundations')

    setCurrentPath.mockResolvedValueOnce(current.data.value)
    options.action.run()
    expect(setCurrentPath).toHaveBeenLastCalledWith({ courseEnrollmentId: 'e-2' })
  })

  it('opens My path straight away when the course is already the current one', async () => {
    enrollments.enrollments.value = [enrollment()]
    current.data.value = currentPath()
    current.error.value = null
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).not.toHaveBeenCalled()
    expect(toast.neutral).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('stays on the course with an error when the switch fails', async () => {
    enrollments.enrollments.value = [enrollment()]
    setCurrentPath.mockRejectedValueOnce(new Error('Failed to switch'))
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Failed to switch')
    expect(push).not.toHaveBeenCalled()
  })

  // ── The outline ─────────────────────────────────────────────────────────

  it('marks each part done, current or upcoming', () => {
    enrollments.enrollments.value = [enrollment()]

    expect(partStates(mountView())).toEqual(['done', 'current', 'upcoming', 'upcoming'])
  })

  it('opens the current part unfolded with its lessons and the way to My path', async () => {
    enrollments.enrollments.value = [enrollment()]
    current.data.value = currentPath({ course_enrollment_id: 'e-other' })
    current.error.value = null
    setCurrentPath.mockResolvedValueOnce(currentPath())
    const wrapper = mountView()
    const rows = wrapper.findAll('[data-test="part-row"]')

    expect(rows[1]?.find('[data-test="part-lessons"]').exists()).toBe(true)
    expect(rows[0]?.find('[data-test="part-lessons"]').exists()).toBe(false)
    expect(rows[2]?.find('[data-test="part-lessons"]').exists()).toBe(false)

    await rows[1]?.get('[data-test="open-in-path"]').trigger('click')
    await flushPromises()
    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-1' })
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('unfolds another part to its titles when tapped', async () => {
    enrollments.enrollments.value = [enrollment()]
    const wrapper = mountView()

    await wrapper.findAll('[data-test="part-toggle"]')[2]?.trigger('click')

    const third = wrapper.findAll('[data-test="part-row"]')[2]
    expect(third?.findAll('[data-test="part-lesson"]').map((lesson) => lesson.text())).toHaveLength(10)
    expect(third?.find('[data-test="open-in-path"]').exists()).toBe(false)
  })

  it('lists every outline item, even when two share a title', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const items = (names: string[]) => names.map((title) => ({ title }))
    published.course.value = course({
      checkpoints: [{ position: 1, title: 'Open chords', items: items(['Warm-up', 'Practice', 'E major', 'Practice']) }],
    })
    const wrapper = mountView()
    await wrapper.get('[data-test="part-toggle"]').trigger('click')

    expect(wrapper.findAll('[data-test="part-lesson"]').map((lesson) => lesson.text())).toEqual([
      'Warm-up',
      'Practice',
      'E major',
      'Practice',
    ])
    expect(warn.mock.calls.flat().join(' ')).not.toContain('Duplicate keys')
    warn.mockRestore()
  })

  it('counts the current part’s lessons when the course is the current one', () => {
    enrollments.enrollments.value = [enrollment()]
    current.data.value = currentPath({ items: pathItems(7, 14) })
    current.error.value = null

    const meta = mountView().findAll('[data-test="part-meta"]')[1]
    expect(meta?.text()).toBe('Part 2 · 7 of 14 lessons done')
  })

  it('shows the current part without a count when another course is current', () => {
    enrollments.enrollments.value = [enrollment()]
    current.data.value = currentPath({ course_enrollment_id: 'e-other', items: pathItems(7, 14) })
    current.error.value = null

    const meta = mountView().findAll('[data-test="part-meta"]')[1]
    expect(meta?.text()).toBe('Part 2 · 14 lessons')
  })

  // ── Not enrolled, left, finished ────────────────────────────────────────

  it('offers to start a course the student never took, with its size in the outline heading', () => {
    const wrapper = mountView()

    expect(wrapper.get('[data-test="start"]').text()).toBe('Start course')
    expect(wrapper.find('[data-test="left-before"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="leave"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="outline-heading"]').text()).toBe('Course outline · 4 parts · 44 lessons')
    expect(partStates(wrapper)).toEqual(['upcoming', 'upcoming', 'upcoming', 'upcoming'])
  })

  it('offers a left course again from part 1', () => {
    enrollments.enrollments.value = [enrollment({ status: 'abandoned' })]
    const wrapper = mountView()

    expect(wrapper.get('[data-test="start"]').text()).toBe('Start course')
    expect(wrapper.get('[data-test="left-before"]').text()).toBe(
      'You left this course before. Starting again begins at part 1.',
    )
    expect(wrapper.find('[data-test="leave"]').exists()).toBe(false)
  })

  describe('starting', () => {
    const RHYTHM = standalonePath({ student_path_id: 'sp-rhythm', source_template_id: 'lp-rhythm', title: 'Reading rhythm' })

    function rhythmIsCurrent() {
      standalone.paths.value = [RHYTHM]
      current.data.value = currentPath({ student_path_id: 'sp-rhythm', title: 'Reading rhythm', course_enrollment_id: null })
      current.error.value = null
    }

    function enrolsAs(id: string) {
      enrollInCourse.mockResolvedValueOnce({
        outcome: 'enrolled',
        enrollment: enrollment({ course_enrollment_id: id, active_checkpoint_position: 1 }),
      })
    }

    it('enrols, makes the course current and opens My path, with an Undo back, without asking', async () => {
      rhythmIsCurrent()
      enrolsAs('e-9')
      setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-9' }))
      const wrapper = mountView()

      await wrapper.get('[data-test="start"]').trigger('click')
      await flushPromises()

      expect(document.querySelector('[role="alertdialog"]')).toBeNull()
      expect(enrollInCourse).toHaveBeenCalledWith('c-1')
      expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-9' })
      expect(push).toHaveBeenCalledWith({ name: 'path' })
      expect(toast.success).not.toHaveBeenCalled()
      const [message, options] = toast.neutral.mock.calls[0] ?? []
      expect(message).toBe('Now on Guitar foundations')

      setCurrentPath.mockResolvedValueOnce(current.data.value)
      options.action.run()
      expect(setCurrentPath).toHaveBeenLastCalledWith({ studentPathId: 'sp-rhythm' })
    })

    it('offers no Undo when nothing was current', async () => {
      enrolsAs('e-9')
      setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-9' }))
      const wrapper = mountView()

      await wrapper.get('[data-test="start"]').trigger('click')
      await flushPromises()

      expect(toast.neutral).toHaveBeenCalledWith('Now on Guitar foundations', {})
      expect(push).toHaveBeenCalledWith({ name: 'path' })
    })

    it('makes a course it turns out the student had started current, too', async () => {
      enrollInCourse.mockResolvedValueOnce({ outcome: 'already-enrolled' })
      enrollments.retry.mockImplementationOnce(async () => {
        enrollments.enrollments.value = [enrollment({ course_enrollment_id: 'e-7' })]
      })
      setCurrentPath.mockResolvedValueOnce(currentPath({ course_enrollment_id: 'e-7' }))
      const wrapper = mountView()

      await wrapper.get('[data-test="start"]').trigger('click')
      await flushPromises()

      expect(enrollments.retry).toHaveBeenCalled()
      expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-7' })
      expect(push).toHaveBeenCalledWith({ name: 'path' })
    })

    it('stays on the detail with an error when enrolling fails, changing nothing', async () => {
      rhythmIsCurrent()
      enrollInCourse.mockRejectedValueOnce(new Error('Failed to enroll in the course'))
      const wrapper = mountView()

      await wrapper.get('[data-test="start"]').trigger('click')
      await flushPromises()

      expect(toast.error).toHaveBeenCalledWith('Failed to enroll in the course')
      expect(setCurrentPath).not.toHaveBeenCalled()
      expect(push).not.toHaveBeenCalled()
      expect(wrapper.get('[data-test="start"]').attributes('aria-busy')).not.toBe('true')
    })

    it('says the course is in Learning but the other is still current when the switch fails', async () => {
      rhythmIsCurrent()
      enrolsAs('e-9')
      setCurrentPath.mockRejectedValueOnce(new Error('Failed to switch your current course or path'))
      const wrapper = mountView()

      await wrapper.get('[data-test="start"]').trigger('click')
      await flushPromises()

      expect(toast.error).toHaveBeenCalledWith('Guitar foundations is in Learning, but Reading rhythm is still current.')
      expect(push).not.toHaveBeenCalled()
      expect(wrapper.get('[data-test="continue"]').text()).toBe('Continue part 1')
    })
  })

  it('shows a finished course with every part done and practice as the way on', () => {
    enrollments.enrollments.value = [enrollment({ status: 'completed', active_checkpoint_position: null })]
    const wrapper = mountView()

    expect(wrapper.get('[data-test="finished-chip"]').text()).toBe('Finished')
    expect(wrapper.get('[data-test="course-progress"]').text()).toContain('4 of 4 parts')
    expect(partStates(wrapper)).toEqual(['done', 'done', 'done', 'done'])
    expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="start"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="leave"]').exists()).toBe(false)
    const practise = wrapper.get('[data-test="practise"]')
    expect(practise.text()).toBe('Practise what you learned')
    expect(practise.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'practice-session' })
  })

  // ── Reviewing a finished course ─────────────────────────────────────────

  describe('reviewing a finished course', () => {
    const finished = () => enrollment({ status: 'completed', active_checkpoint_position: null, active_checkpoint_student_path_id: undefined })

    it('reads the parts of the finished enrolment, not of the course as published now', () => {
      enrollments.enrollments.value = [finished()]
      const wrapper = mountView()

      expect(useEnrollmentParts.mock.calls[0]?.[0]()).toBe('e-1')
      expect(wrapper.findAll('[data-test="part-title"]').map((title) => title.text())).toEqual([
        'Open chords',
        'Major triads',
        'Seventh chords',
        'Accompany a song',
      ])
    })

    it('unfolds every part, when tapped, to its lessons, each a row that opens it for review', async () => {
      enrollments.enrollments.value = [finished()]
      const wrapper = mountView()

      await wrapper.findAll('[data-test="part-toggle"]')[1]!.trigger('click')

      const rows = wrapper.findAll('[data-test="review-lesson"]')
      expect(rows.map((row) => row.text())).toEqual([
        expect.stringContaining('Root position'),
        expect.stringContaining('Inversions'),
      ])
      expect(rows[1]!.findComponent(RouterLinkStub).props('to')).toEqual({
        name: 'review-lesson',
        params: { studentPathId: 'part-2', nodeId: 'p2-n2' },
      })
      expect(wrapper.find('[data-test="open-in-path"]').exists()).toBe(false)
    })

    it('opens with every part folded', () => {
      enrollments.enrollments.value = [finished()]
      const wrapper = mountView()

      expect(wrapper.find('[data-test="review-lesson"]').exists()).toBe(false)
    })

    it('offers Try again in place of the outline when the parts fail to load, and keeps practice', async () => {
      enrollments.enrollments.value = [finished()]
      parts.parts.value = []
      parts.error.value = true
      const wrapper = mountView()

      expect(wrapper.find('[data-test="part-row"]').exists()).toBe(false)
      await wrapper.get('[data-test="parts-retry"]').trigger('click')
      expect(parts.retry).toHaveBeenCalled()
      expect(wrapper.find('[data-test="practise"]').exists()).toBe(true)
    })

    it('reads no parts for a course in progress, whose lessons open from My path', () => {
      enrollments.enrollments.value = [enrollment()]
      const wrapper = mountView()

      expect(useEnrollmentParts.mock.calls[0]?.[0]()).toBeNull()
      expect(wrapper.find('[data-test="review-lesson"]').exists()).toBe(false)
    })
  })

  // ── Leaving ─────────────────────────────────────────────────────────────

  it('puts Leave this course last, and asks before leaving', async () => {
    enrollments.enrollments.value = [enrollment()]
    const wrapper = mountView()
    const leaveButton = wrapper.get('[data-test="leave"]')

    expect(leaveButton.text()).toBe('Leave this course')
    expect(leave).not.toHaveBeenCalled()

    await leaveButton.trigger('click')
    const dialog = inLayer('[role="alertdialog"]').textContent
    expect(dialog).toContain('Leave Guitar foundations?')
    expect(dialog).toContain('Your practice and skill levels stay.')
    expect(dialog).not.toContain('continue with')
  })

  it('leaves on confirm and then offers to start again', async () => {
    enrollments.enrollments.value = [enrollment()]
    leave.mockResolvedValueOnce({ enrollment: enrollment({ status: 'abandoned' }) })
    const wrapper = mountView()

    await wrapper.get('[data-test="leave"]').trigger('click')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(leave).toHaveBeenCalledWith(expect.objectContaining({ key: 'course:e-1', state: 'in-progress' }), null)
    expect(wrapper.get('[data-test="start"]').text()).toBe('Start course')
    expect(wrapper.find('[data-test="left-before"]').exists()).toBe(true)
  })

  it('names what comes next when leaving the current course, and moves on to it', async () => {
    enrollments.enrollments.value = [enrollment()]
    standalone.paths.value = [standalonePath({ title: 'Open chords' })]
    current.data.value = currentPath()
    current.error.value = null
    const next = currentPath({ course_enrollment_id: null, student_path_id: 'sp-1', title: 'Open chords' })
    leave.mockResolvedValueOnce({ enrollment: enrollment({ status: 'abandoned' }), current: next })
    const wrapper = mountView()

    await wrapper.get('[data-test="leave"]').trigger('click')
    expect(inLayer('[role="alertdialog"]').textContent).toContain("You'll continue with Open chords.")

    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(leave).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'course:e-1', state: 'current' }),
      expect.objectContaining({ key: 'path:sp-1' }),
    )
    expect(current.data.value).toEqual(next)
  })

  it('says so when the switch went through but the leave did not', async () => {
    enrollments.enrollments.value = [enrollment()]
    standalone.paths.value = [standalonePath({ title: 'Open chords' })]
    current.data.value = currentPath()
    current.error.value = null
    const now = currentPath({ course_enrollment_id: null, student_path_id: 'sp-1' })
    leave.mockRejectedValueOnce(new LeaveFailedAfterSwitchError('Failed to leave the course', now))
    const wrapper = mountView()

    await wrapper.get('[data-test="leave"]').trigger('click')
    inLayer('[data-test="confirm-dialog-confirm"]').click()
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith("You're now on Open chords, but Guitar foundations wasn't left. Try again.")
    expect(current.data.value).toEqual(now)
    expect(wrapper.find('[data-test="continue"]').exists()).toBe(true)
  })

  // ── States ──────────────────────────────────────────────────────────────

  it('waits for the enrolments before offering anything', () => {
    enrollments.isLoading.value = true
    const wrapper = mountView()

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="start"]').exists()).toBe(false)
  })

  it('explains when the course is not published', () => {
    published.course.value = null
    published.notFound.value = true

    expect(mountView().find('[data-test="not-found"]').exists()).toBe(true)
  })

  it('offers to try again when the course or the enrolments fail to load', async () => {
    enrollments.error.value = true
    const wrapper = mountView()

    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(enrollments.retry).toHaveBeenCalled()
    expect(published.retry).not.toHaveBeenCalled()
  })
})
