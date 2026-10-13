import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type * as VueRouter from 'vue-router'

import type { components } from '@/api/generated/core-domain'

type PathDetail = components['schemas']['PathDetail']
type StudentPath = components['schemas']['StudentPath']
type StudentPathView = components['schemas']['StudentPathView']

const detail = {
  path: ref<PathDetail | null>(null),
  isLoading: ref(false),
  error: ref(false),
  notFound: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useCatalogPath', () => ({
  useCatalogPath: () => detail,
}))

const held = { paths: ref<StudentPath[]>([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }
vi.mock('@/features/student/composables/useMyStandalonePaths', () => ({
  useMyStandalonePaths: () => held,
}))

const current = {
  data: ref<StudentPathView | null>(null),
  error: ref<'no-path' | 'load-failed' | null>('no-path'),
  isLoading: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useStudentPath', () => ({
  useStudentPath: () => current,
}))

const heldPath = {
  view: ref<StudentPathView | null>(null),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
const useHeldStudentPath = vi.fn<(studentPathId: () => string | null) => typeof heldPath>(() => heldPath)
vi.mock('@/features/student/composables/useHeldStudentPath', () => ({
  useHeldStudentPath: (studentPathId: () => string | null) => useHeldStudentPath(studentPathId),
}))

const setCurrentPath = vi.fn()
vi.mock('@/features/student/composables/useSetCurrentPath', () => ({
  useSetCurrentPath: () => ({ setCurrentPath }),
}))

const enrollInLearningPath = vi.fn()
vi.mock('@/features/student/composables/useEnrollInLearningPath', () => ({
  useEnrollInLearningPath: () => ({ enrollInLearningPath }),
}))

vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({ instruments: ref([]), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
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
  name: 'path-detail',
  params: { learningPathId: 'lp-1' },
  query: {} as Record<string, string>,
}
vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof VueRouter>('vue-router')
  return { ...actual, useRoute: () => route, useRouter: () => ({ push }) }
})

import { makeCurrentPath as currentPath } from '@/features/student/testing/learning'
import { saveCatalogReturn } from '@/features/student/utils/catalogReturn'
import PathDetailView from '@/features/student/views/PathDetailView.vue'
import PageBackBar from '@/shared/components/PageBackBar.vue'

function pathDetail(overrides: Partial<PathDetail> = {}): PathDetail {
  return {
    learning_path_id: 'lp-1',
    title: 'Open chords',
    summary: 'Your first five chords, cleanly.',
    level: 'beginner',
    language: 'en',
    created_by: { user_id: 'teacher-1', display_name: 'Bob Martins' },
    instrument_ids: [],
    lesson_count: 4,
    items: [],
    ...overrides,
  }
}

function heldCopy(overrides: Partial<StudentPath> = {}): StudentPath {
  return {
    student_path_id: 'sp-1',
    student: { user_id: 'st-1', display_name: 'Alice Souza' },
    source_template_id: 'lp-1',
    title: 'Open chords',
    assigned_by: { user_id: 'st-1', display_name: 'Alice Souza' },
    assigned_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    source_course_enrollment_id: null,
    course_checkpoint_position: null,
    lesson_count: 4,
    completed_count: 1,
    update_available: false,
    ...overrides,
  }
}

function mountView() {
  return mount(PathDetailView, { attachTo: document.body, global: { stubs: { RouterLink: RouterLinkStub } } })
}

function inLayer(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`nothing matches ${selector}`)
  return element
}

describe('PathDetailView', () => {
  beforeEach(() => {
    detail.path.value = pathDetail()
    detail.isLoading.value = false
    detail.error.value = false
    detail.notFound.value = false
    held.paths.value = []
    heldPath.view.value = null
    heldPath.isLoading.value = false
    heldPath.error.value = false
    current.data.value = null
    route.name = 'path-detail'
    route.query = {}
    saveCatalogReturn('paths', { itemId: 'lp-1', query: { q: 'chords' }, loadedCount: 20, scrollY: 0 })
    vi.clearAllMocks()
  })

  // ── The way back ────────────────────────────────────────────────────────

  it('goes back to Discover, with its search and filters, when opened from it', () => {
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('title')).toBe('Discover')
    expect(back.props('to')).toEqual({ name: 'path-catalog', query: { q: 'chords', returnFromPath: 'lp-1' } })
  })

  // ── The top ─────────────────────────────────────────────────────────────

  it('shows the path’s chips, title, teacher and summary, and offers Start path', () => {
    const wrapper = mountView()

    expect(wrapper.findAll('[data-test="path-chip"]').map((chip) => chip.text())).toEqual(['Beginner', 'English'])
    expect(wrapper.get('[data-test="path-detail-title"]').text()).toBe('Open chords')
    expect(wrapper.get('[data-test="path-detail-byline"]').text()).toBe('by Bob Martins')
    expect(wrapper.get('[data-test="path-detail-summary"]').text()).toBe('Your first five chords, cleanly.')
    expect(wrapper.get('[data-test="path-detail-lessons"]').text()).toBe('4 lessons')
    expect(wrapper.find('[data-test="in-learning-chip"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="path-progress"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="start"]').text()).toBe('Start path')
  })

  it('opens Discover on paths filtered by the teacher from the byline', () => {
    const byline = mountView().get('[data-test="path-detail-byline"]')

    expect(byline.findComponent(RouterLinkStub).props('to')).toEqual({
      name: 'path-catalog',
      query: { teacher: 'teacher-1' },
    })
  })

  it('shows a path in Learning with its chip, its progress and Continue path', () => {
    held.paths.value = [heldCopy({ completed_count: 1 })]
    const wrapper = mountView()

    expect(wrapper.get('[data-test="in-learning-chip"]').text()).toBe('In Learning')
    expect(wrapper.get('[data-test="path-progress"]').text()).toContain('1 of 4 lessons')
    expect(wrapper.get('[data-test="continue"]').text()).toBe('Continue path')
    expect(wrapper.find('[data-test="start"]').exists()).toBe(false)
  })

  it('leads back to Where to start, with the same answers, when opened from it', () => {
    route.query = { startInstrument: 'inst-guitar', startExperience: 'never_played' }

    const back = mountView().getComponent(PageBackBar)

    expect(back.props('to')).toEqual({
      name: 'home',
      query: { instrument: 'inst-guitar', experience: 'never_played' },
    })
    expect(back.props('title')).toBe('Where to start')
  })

  it('opens a fresh catalog when the learner did not come from it', () => {
    window.localStorage.clear()

    expect(mountView().getComponent(PageBackBar).props('to')).toEqual({ name: 'path-catalog' })
  })

  // ── The outline ─────────────────────────────────────────────────────────

  it('numbers the lessons under their section labels, with how many each has', () => {
    detail.path.value = pathDetail({
      items: [
        { title: 'Welcome' },
        { title: 'E major', section_label: 'Chords' },
        { title: 'A minor', section_label: 'Chords' },
        { title: 'Strum it', section_label: 'Rhythm' },
      ],
    })

    const wrapper = mountView()

    expect(wrapper.get('[data-test="outline-heading"]').text()).toBe('Path outline · 4 lessons')
    const sections = wrapper.findAll('[data-test="outline-section"]')
    expect(sections.map((s) => (s.find('h3').exists() ? s.get('h3').text() : null))).toEqual([
      null,
      'Chords2 lessons',
      'Rhythm1 lesson',
    ])
    expect(sections.map((s) => s.findAll('[data-test="outline-lesson"]').map((li) => li.text()))).toEqual([
      ['1Welcome'],
      ['2E major', '3A minor'],
      ['4Strum it'],
    ])
  })

  it('does not open a lesson from the outline', () => {
    detail.path.value = pathDetail({ items: [{ title: 'Welcome' }] })

    const outline = mountView().get('[data-test="outline-section"]')
    expect(outline.findAll('a, button')).toHaveLength(0)
  })

  // ── The action ──────────────────────────────────────────────────────────

  it('starts the path, which the server makes current, and opens My path with an Undo back', async () => {
    current.data.value = currentPath({ course_enrollment_id: 'e-rhythm', title: 'Reading rhythm · Part 1' })
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    await wrapper.get('[data-test="start"]').trigger('click')
    await flushPromises()

    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
    expect(enrollInLearningPath).toHaveBeenCalledWith('lp-1')
    expect(setCurrentPath).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
    expect(toast.success).not.toHaveBeenCalled()
    const [message, options] = toast.neutral.mock.calls[0] ?? []
    expect(message).toBe('Now on Open chords')

    setCurrentPath.mockResolvedValueOnce(current.data.value)
    options.action.run()
    expect(setCurrentPath).toHaveBeenCalledWith({ courseEnrollmentId: 'e-rhythm' })
  })

  it('offers no Undo when nothing was current', async () => {
    enrollInLearningPath.mockResolvedValueOnce(heldCopy())
    const wrapper = mountView()

    await wrapper.get('[data-test="start"]').trigger('click')
    await flushPromises()

    expect(toast.neutral).toHaveBeenCalledWith('Now on Open chords', {})
  })

  it('makes a held path current first on Continue path, with an Undo, then opens My path', async () => {
    held.paths.value = [heldCopy()]
    current.data.value = currentPath({ course_enrollment_id: 'e-rhythm' })
    setCurrentPath.mockResolvedValueOnce(currentPath({ student_path_id: 'sp-1', course_enrollment_id: null }))
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(enrollInLearningPath).not.toHaveBeenCalled()
    expect(setCurrentPath).toHaveBeenCalledWith({ studentPathId: 'sp-1' })
    expect(toast.neutral.mock.calls[0]?.[0]).toBe('Now on Open chords')
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('opens My path straight away on Continue path when the path is already current', async () => {
    held.paths.value = [heldCopy()]
    current.data.value = currentPath({ student_path_id: 'sp-1', course_enrollment_id: null })
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(setCurrentPath).not.toHaveBeenCalled()
    expect(toast.neutral).not.toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith({ name: 'path' })
  })

  it('stays on the detail when Continue path cannot switch', async () => {
    held.paths.value = [heldCopy()]
    current.data.value = currentPath({ course_enrollment_id: 'e-rhythm' })
    setCurrentPath.mockRejectedValueOnce(new Error('Failed to switch your current course or path'))
    const wrapper = mountView()

    await wrapper.get('[data-test="continue"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Failed to switch your current course or path')
    expect(push).not.toHaveBeenCalled()
  })

  it('does not count an archived copy as held', () => {
    held.paths.value = [heldCopy({ archived_at: '2026-09-10T00:00:00Z' })]

    expect(mountView().get('[data-test="start"]').text()).toBe('Start path')
  })

  it('reports a failed enrollment and lets the learner try again', async () => {
    enrollInLearningPath.mockRejectedValueOnce(new Error('Learning path not found'))
    const wrapper = mountView()

    await wrapper.get('[data-test="start"]').trigger('click')
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith('Learning path not found')
    expect(push).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="start"]').attributes('aria-busy')).not.toBe('true')
  })

  it('shows loading, not-found and error states', async () => {
    detail.path.value = null
    detail.isLoading.value = true
    const wrapper = mountView()
    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)

    detail.isLoading.value = false
    detail.notFound.value = true
    await flushPromises()
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)

    detail.notFound.value = false
    detail.error.value = true
    await flushPromises()
    await wrapper.get('[data-test="error"] button').trigger('click')
    expect(detail.retry).toHaveBeenCalled()
  })

  it('leads back to Learning when opened from Learning', () => {
    route.name = 'learning-path'
    route.query = {}
    const back = mountView().getComponent(PageBackBar)

    expect(back.props('to')).toEqual({ name: 'my-courses' })
    expect(back.props('title')).toBe('Learning')
    expect(back.props('backLabel')).toBe('Back to Learning')
  })

  describe('a newer version of a path the learner holds', () => {
    it('is offered in a quiet card under Continue', () => {
      held.paths.value = [heldCopy({ update_available: true })]
      const card = mountView().get('[data-test="update-card"]')

      expect(card.text()).toContain('A newer version is available')
      expect(card.get('[data-test="update-path"]').text()).toBe('Update path')
    })

    it('is not offered when the copy is up to date', () => {
      held.paths.value = [heldCopy()]

      expect(mountView().find('[data-test="update-card"]').exists()).toBe(false)
    })

    it('updates through the confirm, then drops the card with a success toast', async () => {
      held.paths.value = [heldCopy({ update_available: true })]
      update.mockResolvedValueOnce({ path: heldCopy({ update_available: false, lesson_count: 5 }) })
      const wrapper = mountView()

      await wrapper.get('[data-test="update-path"]').trigger('click')
      expect(inLayer('[role="alertdialog"]').textContent).toContain('Update Open chords?')
      inLayer('[data-test="confirm-dialog-confirm"]').click()
      await flushPromises()

      expect(toast.success).toHaveBeenCalledWith('Open chords is up to date')
      expect(wrapper.find('[data-test="update-card"]').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  // ── Reviewing a finished path ───────────────────────────────────────────

  describe('reviewing a finished path', () => {
    const finishedCopy = () => heldCopy({ completed_count: 4, lesson_count: 4 })
    const finishedView: StudentPathView = {
      student_path_id: 'sp-1',
      source_template_id: 'lp-1',
      title: 'Open chords',
      current_position: 4,
      course_completed: false,
      items: [
        { position: 1, content_node_id: 'n-1', content_node_version_id: 'v-1', title: 'E minor', content_type: 'video', status: 'completed', section_label: 'First chords' },
        { position: 2, content_node_id: 'n-2', content_node_version_id: 'v-2', title: 'A minor', content_type: 'video', status: 'completed', section_label: 'First chords' },
        { position: 3, content_node_id: 'n-3', content_node_version_id: 'v-3', title: 'Reading chord boxes', content_type: 'article', status: 'completed', section_label: 'Reading' },
        { position: 4, content_node_id: 'n-4', content_node_version_id: 'v-4', title: 'Switching', content_type: 'video', status: 'completed', section_label: 'Reading' },
      ],
    }

    beforeEach(() => {
      route.name = 'learning-path'
      held.paths.value = [finishedCopy()]
      heldPath.view.value = finishedView
    })

    it('says it is finished and offers practice instead of continuing', () => {
      const wrapper = mountView()

      expect(wrapper.get('[data-test="finished-chip"]').text()).toBe('Finished')
      expect(wrapper.find('[data-test="continue"]').exists()).toBe(false)
      expect(wrapper.get('[data-test="practise"]').findComponent(RouterLinkStub).props('to')).toEqual({ name: 'practice-session' })
    })

    it('reads the lessons of the student’s own copy', () => {
      mountView()

      expect(useHeldStudentPath.mock.calls[0]?.[0]()).toBe('sp-1')
    })

    it('lists the lessons under their section labels, each done and a row that opens it for review', () => {
      const wrapper = mountView()

      expect(wrapper.findAll('[data-test="section-header"]').map((header) => header.text())).toEqual([
        expect.stringContaining('First chords'),
        expect.stringContaining('Reading'),
      ])
      const rows = wrapper.findAll('[data-test="review-lesson"]')
      expect(rows).toHaveLength(4)
      expect(rows[2]!.text()).toContain('Reading chord boxes')
      expect(rows[2]!.findComponent(RouterLinkStub).props('to')).toEqual({
        name: 'review-lesson',
        params: { studentPathId: 'sp-1', nodeId: 'n-3' },
      })
    })

    it('shows a skeleton under the heading while the lessons load', () => {
      heldPath.view.value = null
      heldPath.isLoading.value = true
      const wrapper = mountView()

      expect(wrapper.find('[data-test="lessons-loading"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="review-lesson"]').exists()).toBe(false)
    })

    it('offers Try again in place of the lessons when they fail to load', async () => {
      heldPath.view.value = null
      heldPath.error.value = true
      const wrapper = mountView()

      expect(wrapper.find('[data-test="review-lesson"]').exists()).toBe(false)
      await wrapper.get('[data-test="lessons-retry"]').trigger('click')
      expect(heldPath.retry).toHaveBeenCalled()
    })

    it('reads no copy for a path still in progress', () => {
      held.paths.value = [heldCopy({ completed_count: 1 })]
      const wrapper = mountView()

      expect(useHeldStudentPath.mock.calls[0]?.[0]()).toBeNull()
      expect(wrapper.find('[data-test="review-lesson"]').exists()).toBe(false)
      expect(wrapper.find('[data-test="continue"]').exists()).toBe(true)
    })
  })
})
