import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const coreGET = vi.fn()
const eventGET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: coreGET }, eventApi: { GET: eventGET } }),
}))

import AlphaEventsView from '@/features/admin/views/AlphaEventsView.vue'
import { ALPHA_NOW, makeAlphaStudent, makeLoggedEvent } from '@/shared/testUtils/alphaObservation'
import { mockViewport } from '@/shared/testUtils/viewport'

const TeachShellStub = { template: '<div><slot /></div>' }

const CAMILA = 's-camila'
const students = ['Lucas Pereira', 'Beatriz Rocha', 'Rafael Nunes', 'Camila Duarte', 'Marina Alves', 'Thiago Lima', 'Ana Clara Souza'].map((name) =>
  makeAlphaStudent({ student_id: name === 'Camila Duarte' ? CAMILA : `s-${name}`, display_name: name }),
)

function events(count: number, from: number) {
  return Array.from({ length: count }, (_, i) =>
    makeLoggedEvent({
      received_at: `2026-10-14T10:${String(59 - from - i).padStart(2, '0')}:00Z`,
      event: { ...makeLoggedEvent().event, event_id: `e-${from + i}`, student_id: CAMILA },
    }),
  )
}

interface StudentsQuery {
  q?: string
  student_id?: string[]
  limit: number
}

/** Answers the student lookup like the server: by part of the name, or by id, only the alpha's. */
function serveStudents() {
  coreGET.mockImplementation((_path: string, init: { params: { query: StudentsQuery } }) => {
    const { q, student_id: ids } = init.params.query
    const items = students
      .filter((s) => (!q || s.display_name.toLowerCase().includes(q.toLowerCase())) && (!ids || ids.includes(s.student_id)))
      .map((s) => ({ user_id: s.student_id, display_name: s.display_name }))
    return Promise.resolve({ data: { items, total: items.length, limit: 20, offset: 0 }, response: new Response(null, { status: 200 }) })
  })
}

function serve() {
  serveStudents()
  eventGET.mockImplementation((_path: string, init: { params: { query: { offset: number } } }) => {
    const offset = init.params.query.offset
    return Promise.resolve({ data: { items: events(Math.min(12, 46 - offset), offset), total: 46, limit: 12, offset } })
  })
}

async function mountEvents(path = '/admin/alpha/events') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/alpha', name: 'admin-alpha', component: { template: '<div />' } },
      { path: '/admin/alpha/events', name: 'admin-alpha-events', component: AlphaEventsView },
    ],
  })
  await router.push(path)
  const wrapper = mount(AlphaEventsView, { global: { plugins: [router], stubs: { TeachShell: TeachShellStub } } })
  await flushPromises()
  return wrapper
}

async function pickStudent(wrapper: Awaited<ReturnType<typeof mountEvents>>, typed: string, name: string) {
  const input = wrapper.get('[data-test="student-search"] [role="combobox"]')
  await input.trigger('focus')
  await input.setValue(typed)
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
  const option = wrapper.findAll('[role="option"]').find((o) => o.text() === name)
  if (!option) throw new Error(`${name} is not offered`)
  await option.trigger('mousedown')
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(ALPHA_NOW)
  mockViewport(1280)
  coreGET.mockReset()
  eventGET.mockReset()
  serve()
})

afterEach(() => vi.useRealTimers())

describe('AlphaEventsView', () => {
  it('lists the 12 most recently received events, with when, whose, the type and its details', async () => {
    const wrapper = await mountEvents()

    expect(eventGET).toHaveBeenCalledWith('/admin/events', { params: { query: { limit: 12, offset: 0 } } })
    const rows = wrapper.findAll('[data-test="event-row"]')
    expect(rows).toHaveLength(12)
    expect(rows[0]!.get('[data-test="event-received"]').text()).toBe('14 Oct · 07:59:00')
    expect(rows[0]!.get('[data-test="event-student"]').text()).toBe('Camila Duarte')
    expect(rows[0]!.get('[data-test="event-type"]').text()).toBe('practice.session_ended')
  })

  it('adds the next 12 below with "Load 12 more"', async () => {
    const wrapper = await mountEvents()

    const loadMore = wrapper.get('[data-test="load-more"]')
    expect(loadMore.text()).toBe('Load 12 more')
    await loadMore.trigger('click')
    await flushPromises()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { limit: 12, offset: 12 } } })
    expect(wrapper.findAll('[data-test="event-row"]')).toHaveLength(24)
  })

  it('finds students by name in the student search', async () => {
    const wrapper = await mountEvents()
    const input = wrapper.get('[data-test="student-search"] [role="combobox"]')

    await input.trigger('focus')
    await input.setValue('cami')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(coreGET).toHaveBeenLastCalledWith('/admin/alpha-observation/students', { params: { query: { q: 'cami', limit: 20 } } })
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['All students', 'Camila Duarte'])
  })

  it('filters the events to the student picked, shown as a chip after the search', async () => {
    const wrapper = await mountEvents()

    await pickStudent(wrapper, 'cami', 'Camila Duarte')

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
    expect(wrapper.get('[data-test="student-search"] [data-test="filter-chip"]').text()).toBe('Camila Duarte')
  })

  it("shows everyone's events again when the picked student is removed", async () => {
    const wrapper = await mountEvents()
    await pickStudent(wrapper, 'cami', 'Camila Duarte')

    await wrapper.get('[data-test="student-search"] [data-test="filter-chip"] button').trigger('click')
    await flushPromises()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { limit: 12, offset: 0 } } })
    expect(wrapper.find('[data-test="student-search"] [data-test="filter-chip"]').exists()).toBe(false)
  })

  it('names the students on the page with one lookup by id, not the whole alpha', async () => {
    await mountEvents()

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation/students', { params: { query: { student_id: [CAMILA], limit: 100 } } })
    expect(coreGET).not.toHaveBeenCalledWith('/admin/alpha-observation', expect.anything())
  })

  it('filters by a type group', async () => {
    const wrapper = await mountEvents()

    const types = wrapper.findAll('[data-test^="type-chip-"]').map((c) => c.text())
    expect(types).toEqual(['All', 'Practice sessions', 'Answers', 'Lessons', 'Exercises', 'Song charts'])
    await wrapper.get('[data-test="type-chip-practice_sessions"]').trigger('click')
    await flushPromises()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { type_group: 'practice_sessions', limit: 12, offset: 0 } } })
  })

  it("counts a student's events when they are picked", async () => {
    const wrapper = await mountEvents()

    await pickStudent(wrapper, 'cami', 'Camila Duarte')

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
    expect(wrapper.get('[data-test="event-count"]').text()).toBe('46 events for Camila Duarte · showing the latest 12')
  })

  it('opens with the student picked when it comes from a student', async () => {
    const wrapper = await mountEvents(`/admin/alpha/events?student=${CAMILA}`)

    expect(wrapper.get('[data-test="student-search"] [data-test="filter-chip"]').text()).toBe('Camila Duarte')
    expect(eventGET).toHaveBeenCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
  })

  it('leads back to the overview', async () => {
    const wrapper = await mountEvents()

    expect(wrapper.get('[data-test="breadcrumb"]').attributes('href')).toBe('/admin/alpha')
  })

  it('lays events out in columns only where the columns fit', async () => {
    const wide = await mountEvents()
    expect(wide.find('[data-test="event-columns"]').exists()).toBe(true)
    expect(wide.findAll('[data-test="event-row"]')[0]!.attributes('data-layout')).toBe('columns')

    mockViewport(900)
    const narrow = await mountEvents()
    expect(narrow.find('[data-test="event-columns"]').exists()).toBe(false)
    expect(narrow.findAll('[data-test="event-row"]')[0]!.attributes('data-layout')).toBe('stacked')
  })

  it("names someone outside the alpha by the start of their id, so they can still be told apart", async () => {
    eventGET.mockResolvedValue({
      data: {
        items: [makeLoggedEvent({ event: { ...makeLoggedEvent().event, student_id: '1a2b3c4d-0000-4000-8000-000000000009' } })],
        total: 1,
        limit: 12,
        offset: 0,
      },
    })

    const wrapper = await mountEvents()

    expect(wrapper.get('[data-test="event-student"]').text()).toBe('User 1a2b3c4d…')
  })

  it("says so when the students' names can't be loaded, and loads them again on retry", async () => {
    const answer = coreGET.getMockImplementation()
    coreGET.mockImplementation((path: string, init: { params: { query: StudentsQuery } }) =>
      init.params.query.student_id ? Promise.resolve({ error: {}, response: new Response(null, { status: 500 }) }) : answer?.(path, init),
    )

    const wrapper = await mountEvents()

    expect(wrapper.get('[data-test="names-error"]').text()).toContain("Couldn't load the students.")
    serveStudents()
    await wrapper.get('[data-test="names-error"] [data-test="retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('[data-test="event-student"]')[0]!.text()).toBe('Camila Duarte')
  })
})
