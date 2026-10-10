import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import {
  makeStudentPathItem as step,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

type StudentPathView = components['schemas']['StudentPathView']
type StudentPathItem = components['schemas']['StudentPathItem']

const state = {
  data: ref<StudentPathView | null>(null),
  error: ref<string | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useStudentPath', () => ({ useStudentPath: () => state }))

const course = ref<{ title: string; part: number; parts: number } | null>(null)
vi.mock('@/features/student/composables/usePathCourse', () => ({ usePathCourse: () => course }))

import PathView from '@/features/student/views/PathView.vue'
import { mockViewport } from '@/shared/testUtils/viewport'

const page = { template: '<div />' }
function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/path', name: 'path', component: page },
      { path: '/path/nodes/:nodeId', name: 'node', component: page },
      { path: '/paths', name: 'path-catalog', component: page },
      { path: '/courses', name: 'course-catalog', component: page },
      { path: '/courses/mine/:enrollmentId/completed', name: 'course-completed', component: page },
      { path: '/practice/session', name: 'practice-session', component: page },
    ],
  })
}

let wrapper: ReturnType<typeof mount> | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountView(data: StudentPathView | null, overrides: { error?: string; isLoading?: boolean } = {}) {
  state.data.value = data
  state.error.value = overrides.error ?? null
  state.isLoading.value = overrides.isLoading ?? false
  const router = makeRouter()
  await router.push('/path')
  wrapper = mount(PathView, { global: { plugins: [router] }, attachTo: document.body })
  return { wrapper, router }
}

const done = (position: number, label?: string) => step(position, label, 'completed')
const behind = (position: number, label?: string): StudentPathItem => ({ ...step(position, label, 'locked'), lock_reason: 'previous_step' })
const inLanguage = (position: number, code: string, name: string, label?: string): StudentPathItem => ({
  ...step(position, label, 'locked'),
  lock_reason: 'language',
  available_languages: [{ code, name }],
})

/** Steps 1–7 done, 8 next, 9–14 locked behind it, in three sections. */
function openChords(overrides: Partial<StudentPathView> = {}) {
  const items = [
    ...[1, 2, 3, 4, 5].map((p) => done(p, 'Getting started')),
    done(6, 'First chords'),
    done(7, 'First chords'),
    { ...step(8, 'First chords'), title: 'The G chord' },
    ...[9, 10].map((p) => behind(p, 'First chords')),
    ...[11, 12, 13, 14].map((p) => behind(p, 'Changes')),
  ]
  return view(items, { title: 'Open chords', ...overrides })
}

const rowOf = (w: ReturnType<typeof mount>, position: number) =>
  w.findAll('[data-test="step-row"]').find((row) => row.get('[data-test="step-marker"]').text() === String(position) || row.text().includes(`Step ${position}`))

describe('PathView — the next step', () => {
  it('puts the next step first: where it sits, its title, its kind and Start lesson', async () => {
    const { wrapper } = await mountView(openChords())

    const card = wrapper.get('[data-test="next-step-card"]')
    expect(card.text()).toContain('Up next · step 8 of 14')
    expect(card.text()).toContain('The G chord')
    expect(card.text()).toContain('Video')
    expect(card.get('[data-test="next-step-action"]').text()).toBe('Start lesson')
    expect(card.get('[data-test="next-step-action"]').attributes('href')).toBe('/path/nodes/node-8')
  })

  it('has no other primary action on the screen', async () => {
    const { wrapper } = await mountView(openChords())

    expect(wrapper.findAll('[data-test="next-step-action"]')).toHaveLength(1)
  })

  it('shows the path title and progress', async () => {
    const { wrapper } = await mountView(openChords())

    expect(wrapper.get('h1').text()).toBe('Open chords')
    expect(wrapper.get('[data-test="path-progress"]').text()).toContain('7 of 14')
  })

  it('names the course and the part above the title of a course part', async () => {
    course.value = { title: 'Guitar from zero', part: 2, parts: 3 }
    const { wrapper } = await mountView(openChords())
    course.value = null

    expect(wrapper.get('[data-test="path-eyebrow"]').text()).toBe('Guitar from zero · Part 2 of 3')
  })

  it('shows each step by kind, never a length', async () => {
    const { wrapper } = await mountView(view([{ ...step(1), content_type: 'article' }, behind(2)]))

    const metas = wrapper.findAll('[data-test="step-meta"]').map((m) => m.text())
    expect(metas).toEqual(['Up next · Article', 'Video'])
  })
})

describe('PathView — sections', () => {
  it('folds a finished section into one row', async () => {
    const { wrapper } = await mountView(openChords())

    const toggle = wrapper.get('[data-test="section-toggle"]')
    expect(toggle.text()).toContain('Getting started')
    expect(toggle.text()).toContain('5 of 5')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.text()).not.toContain('Step 5')
  })

  it('unfolds a finished section on tap', async () => {
    const { wrapper } = await mountView(openChords())

    await wrapper.get('[data-test="section-toggle"]').trigger('click')

    expect(wrapper.text()).toContain('Step 5')
    expect(wrapper.get('[data-test="section-toggle"]').attributes('aria-expanded')).toBe('true')
  })

  it('keeps the current section and the ones after it open', async () => {
    const { wrapper } = await mountView(openChords())

    expect(wrapper.text()).toContain('Step 9')
    expect(wrapper.text()).toContain('Step 14')
  })
})

describe('PathView — step states', () => {
  it('opens a done step for review', async () => {
    const { wrapper } = await mountView(view([done(1), step(2)]))

    expect(wrapper.findAll('[data-test="step-row"]')[0].attributes('href')).toBe('/path/nodes/node-1')
  })

  it('shows a step locked behind an earlier one with only its kind', async () => {
    const { wrapper } = await mountView(openChords())

    const row = rowOf(wrapper, 9)
    expect(row?.get('[data-test="step-meta"]').text()).toBe('Video')
    expect(row?.find('[data-test="step-lock"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Complete the previous step')
  })

  it('says a language-locked step is only in the language it has, in the warning colour', async () => {
    const { wrapper } = await mountView(view([done(1), inLanguage(2, 'es', 'Español'), behind(3)]))

    const meta = wrapper.findAll('[data-test="step-meta"]')[1]
    expect(meta.text()).toBe('Only in Spanish for now')
    expect(meta.classes()).toContain('text-warning')
  })
})

describe('PathView — why a step is locked', () => {
  it('explains a step locked behind an earlier one and offers the step the student can do now', async () => {
    const { wrapper } = await mountView(openChords())

    await rowOf(wrapper, 10)?.trigger('click')

    const panel = wrapper.get('[role="dialog"]')
    expect(panel.text()).toContain('Step 10 opens later')
    expect(panel.text()).toContain('Finish step 8, “The G chord”, and the steps after it open one by one.')
    const action = panel.get('[data-test="locked-step-action"]')
    expect(action.text()).toBe('Go to step 8')
    expect(action.attributes('href')).toBe('/path/nodes/node-8')
  })

  it('offers a language-locked video in the language it has, with no way to skip it', async () => {
    const { wrapper } = await mountView(view([done(1), inLanguage(2, 'es', 'Español'), behind(3)]))

    await wrapper.findAll('[data-test="step-row"]')[1].trigger('click')

    const panel = wrapper.get('[role="dialog"]')
    expect(panel.text()).toContain('Not in English yet')
    const action = panel.get('[data-test="locked-step-action"]')
    expect(action.text()).toBe('Watch in Spanish')
    expect(action.attributes('href')).toBe('/path/nodes/node-2?language=es')
    expect(panel.text().toLowerCase()).not.toContain('skip')
  })

  it('names the way through an article as reading', async () => {
    const { wrapper } = await mountView(view([done(1), { ...inLanguage(2, 'es', 'Español'), content_type: 'article' }]))

    await wrapper.findAll('[data-test="step-row"]')[1].trigger('click')

    expect(wrapper.get('[data-test="locked-step-action"]').text()).toBe('Read in Spanish')
  })

  it('sends the next-step card of a language-locked step straight through its language', async () => {
    const { wrapper } = await mountView(view([done(1), inLanguage(2, 'es', 'Español')]))

    const action = wrapper.get('[data-test="next-step-action"]')
    expect(action.text()).toBe('Watch in Spanish')
    expect(action.attributes('href')).toBe('/path/nodes/node-2?language=es')
  })
})

describe('PathView — complete, no path, loading, error', () => {
  it('celebrates a completed standalone path and points to the next path and to practice', async () => {
    const { wrapper } = await mountView(view([done(1), done(2)], { title: 'Strumming basics', current_position: 2 }))

    const complete = wrapper.get('[data-test="path-complete"]')
    expect(complete.text()).toContain('You finished Strumming basics')
    expect(complete.get('[data-test="find-next-path"]').attributes('href')).toBe('/paths')
    expect(complete.get('[data-test="practise"]').attributes('href')).toBe('/practice/session')
    expect(wrapper.find('[data-test="next-step-card"]').exists()).toBe(false)
  })

  it('takes the student to the course-completed screen when this path completed their course', async () => {
    const data = view([done(1)], { course_completed: true, course_enrollment_id: 'ce-1', course_checkpoint_position: 2 })
    const { router } = await mountView(data)
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('course-completed')
  })

  it('tells a student with no path what a path is and where to find one', async () => {
    const { wrapper } = await mountView(null, { error: 'no-path' })

    const empty = wrapper.get('[data-test="no-path"]')
    expect(empty.text()).toContain('No path yet')
    expect(empty.get('a').text()).toBe('Explore courses and paths')
    expect(empty.get('a').attributes('href')).toBe('/courses')
  })

  it('shows skeleton rows while loading', async () => {
    const { wrapper } = await mountView(null, { isLoading: true })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)
  })

  it('offers Try again when the path fails to load', async () => {
    const { wrapper } = await mountView(null, { error: 'load-failed' })

    expect(wrapper.text()).toContain("We couldn't load your path.")
    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(state.retry).toHaveBeenCalled()
  })
})

describe('PathView — a window with room for two panes', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
    course.value = null
  })

  it('moves the progress and the next step into a side column beside the steps', async () => {
    mockViewport(1280)
    const { wrapper } = await mountView(openChords())

    const side = wrapper.get('[data-test="path-side"]')
    expect(side.get('[data-test="path-progress-card"]').text()).toContain('7 of 14 steps')
    expect(side.find('[data-test="next-step-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="path-list"]').find('[data-test="next-step-card"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="path-list"]').find('[role="progressbar"]').exists()).toBe(false)
  })

  it('keeps the bar\'s full sentence for a screen reader without repeating the count beside it', async () => {
    mockViewport(1280)
    const { wrapper } = await mountView(openChords())

    const card = wrapper.get('[data-test="path-progress-card"]')
    expect(card.get('[role="progressbar"]').attributes('aria-label')).toBe('7 of 14 steps complete')
    expect(card.text().match(/7 of 14/g)).toHaveLength(1)
  })

  it('names the course part under the progress of a course part', async () => {
    mockViewport(1280)
    course.value = { title: 'Guitar foundations', part: 2, parts: 4 }
    const { wrapper } = await mountView(openChords())

    expect(wrapper.get('[data-test="path-progress-card"]').text()).toContain('Part 2 of 4 of Guitar foundations')
  })

  it('says nothing about a course under the progress of a standalone path', async () => {
    mockViewport(1280)
    const { wrapper } = await mountView(openChords())

    expect(wrapper.get('[data-test="path-progress-card"]').text()).not.toContain('Part')
  })

  it('keeps one column, with the next step under the title, in a window too narrow for both panes', async () => {
    mockViewport(1000)
    const { wrapper } = await mountView(openChords())

    expect(wrapper.find('[data-test="path-side"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="next-step-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="path-progress"]').text()).toContain('7 of 14')
  })
})
