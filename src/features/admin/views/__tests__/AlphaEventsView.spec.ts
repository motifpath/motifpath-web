import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const coreGET = vi.fn()
const eventGET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: coreGET }, eventApi: { GET: eventGET } }),
}))

import AlphaEventsView from '@/features/admin/views/AlphaEventsView.vue'
import { ALPHA_NOW, makeAlphaObservation, makeAlphaStudent, makeLoggedEvent } from '@/shared/testUtils/alphaObservation'
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

function serve() {
  coreGET.mockResolvedValue({ data: makeAlphaObservation({ students }), response: new Response(null, { status: 200 }) })
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

const selected = (wrapper: Awaited<ReturnType<typeof mountEvents>>, prefix: string) =>
  wrapper.findAll(`[data-test^="${prefix}-"]`).filter((c) => c.attributes('aria-pressed') === 'true').map((c) => c.text())

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

  it('has a chip for every student, never a "more" chip', async () => {
    const wrapper = await mountEvents()

    const chips = wrapper.findAll('[data-test^="student-chip-"]').map((c) => c.text())
    expect(chips).toEqual(['All students', ...students.map((s) => s.display_name)])
    expect(selected(wrapper, 'student-chip')).toEqual(['All students'])
  })

  it('filters by a type group', async () => {
    const wrapper = await mountEvents()

    const types = wrapper.findAll('[data-test^="type-chip-"]').map((c) => c.text())
    expect(types).toEqual(['All', 'Practice sessions', 'Answers', 'Lessons', 'Exercises', 'Song charts'])
    await wrapper.get('[data-test="type-chip-practice_sessions"]').trigger('click')
    await flushPromises()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { type_group: 'practice_sessions', limit: 12, offset: 0 } } })
  })

  it("counts a student's events when their chip is picked", async () => {
    const wrapper = await mountEvents()

    await wrapper.get(`[data-test="student-chip-${CAMILA}"]`).trigger('click')
    await flushPromises()

    expect(eventGET).toHaveBeenLastCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
    expect(wrapper.get('[data-test="event-count"]').text()).toBe('46 events for Camila Duarte · showing the latest 12')
  })

  it('opens with the student chip picked when it comes from a student', async () => {
    const wrapper = await mountEvents(`/admin/alpha/events?student=${CAMILA}`)

    expect(selected(wrapper, 'student-chip')).toEqual(['Camila Duarte'])
    expect(eventGET).toHaveBeenCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
  })

  it('leads back to the overview', async () => {
    const wrapper = await mountEvents()

    expect(wrapper.get('[data-test="breadcrumb"]').attributes('href')).toBe('/admin/alpha')
  })
})
