import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const coreGET = vi.fn()
const eventGET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: coreGET }, eventApi: { GET: eventGET } }),
}))

import AlphaStudentView from '@/features/admin/views/AlphaStudentView.vue'
import {
  ALPHA_NOW,
  makeAlphaSession,
  makeAlphaStudentObservation,
  makeLoggedEvent,
} from '@/shared/testUtils/alphaObservation'
import { mockViewport } from '@/shared/testUtils/viewport'

const TeachShellStub = { template: '<div><slot /></div>' }
const CAMILA = '00000000-0000-4000-8000-0000000000c1'

const runningWeek = makeAlphaStudentObservation()

const earlierWeeks = makeAlphaStudentObservation({
  week: { week_start: '2026-09-28', week_end: '2026-10-04', running: false },
  session_weeks: [
    {
      week: { week_start: '2026-09-28', week_end: '2026-10-04', running: false },
      finished_sessions: 1,
      sessions: [makeAlphaSession({ practice_session_id: 'e1', started_at: '2026-09-30T10:00:00Z', ended_at: '2026-09-30T10:10:00Z' })],
    },
    {
      week: { week_start: '2026-09-21', week_end: '2026-09-27', running: false },
      finished_sessions: 1,
      sessions: [makeAlphaSession({ practice_session_id: 'e2', started_at: '2026-09-22T10:00:00Z', ended_at: '2026-09-22T10:10:00Z' })],
    },
  ],
})

function serve() {
  coreGET.mockImplementation((_path: string, init: { params: { query: { week?: string } } }) =>
    Promise.resolve({ data: init.params.query.week === '2026-09-28' ? earlierWeeks : runningWeek, response: new Response(null, { status: 200 }) }),
  )
  eventGET.mockResolvedValue({ data: { items: [makeLoggedEvent()], total: 1, limit: 12, offset: 0 } })
}

async function mountStudent(path = `/admin/alpha/students/${CAMILA}`) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/alpha', name: 'admin-alpha', component: { template: '<div />' } },
      { path: '/admin/alpha/students/:studentId', name: 'admin-alpha-student', component: AlphaStudentView, props: true },
      { path: '/admin/alpha/events', name: 'admin-alpha-events', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(AlphaStudentView, {
    props: { studentId: CAMILA },
    global: { plugins: [router], stubs: { TeachShell: TeachShellStub } },
  })
  await flushPromises()
  return { wrapper, router }
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

describe('AlphaStudentView', () => {
  it('loads the student for the week in the address', async () => {
    await mountStudent(`/admin/alpha/students/${CAMILA}?week=2026-10-12`)

    expect(coreGET).toHaveBeenCalledWith('/admin/alpha-observation/students/{student_id}', {
      params: { path: { student_id: CAMILA }, query: { week: '2026-10-12' } },
    })
  })

  it('names the student, when they joined, their first path and when they were last active', async () => {
    const { wrapper } = await mountStudent()

    expect(wrapper.get('h1').text()).toBe('Camila Duarte')
    expect(wrapper.text()).toContain('Joined 21 Sep · first path: Guitar foundations · last active today at 07:51')
  })

  it('shows the three measures', async () => {
    const { wrapper } = await mountStudent()

    const values = wrapper.findAll('[data-test="metric-value"]').map((v) => v.text())
    expect(values).toEqual(['2', '3 of 3', '61%'])
  })

  it('lists the sessions by week, with the ones that do not count, and says only finished ones count', async () => {
    const { wrapper } = await mountStudent()

    const groups = wrapper.findAll('[data-test="session-week"]').map((g) => g.text())
    expect(groups).toEqual(['This week · 12–18 Oct · 2 finished', 'Last week · 5–11 Oct · 1 finished'])
    const states = wrapper.findAll('[data-test="session-state"]').map((s) => s.text())
    expect(states).toEqual(['Finished', 'Ended early', 'Finished', 'Finished'])
    expect(wrapper.text()).toContain('Only finished sessions count toward 3+.')
  })

  it('moves two weeks back with "Earlier weeks"', async () => {
    const { wrapper, router } = await mountStudent(`/admin/alpha/students/${CAMILA}?week=2026-10-12`)

    const earlier = wrapper.get('[data-test="earlier-weeks"]')
    expect(earlier.text()).toBe('Earlier weeks · 21 Sep – 4 Oct')
    await earlier.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ week: '2026-09-28' })
    const groups = wrapper.findAll('[data-test="session-week"]').map((g) => g.text())
    expect(groups).toEqual(['28 Sep – 4 Oct · 1 finished', '21–27 Sep · 1 finished'])
  })

  it('shows the first path node by node, in order', async () => {
    const { wrapper } = await mountStudent()

    const nodes = wrapper.findAll('[data-test="path-node"]')
    expect(nodes.map((n) => n.attributes('data-status'))).toEqual(['completed', 'in_progress', 'not_started'])
    expect(nodes.map((n) => n.find('[data-test="node-date"]').exists() ? n.get('[data-test="node-date"]').text() : null)).toEqual([
      '22 Sep',
      'Started 14 Oct',
      null,
    ])
    expect(wrapper.text()).toContain('Guitar foundations · assigned 21 Sep')
  })

  it('opens the events filtered to the student', async () => {
    const { wrapper } = await mountStudent()

    expect(wrapper.get('[data-test="see-events"]').attributes('href')).toBe(`/admin/alpha/events?student=${CAMILA}`)
  })

  it('leads back to the overview for the same week', async () => {
    const { wrapper } = await mountStudent(`/admin/alpha/students/${CAMILA}?week=2026-10-05`)

    expect(wrapper.get('[data-test="breadcrumb"]').attributes('href')).toBe('/admin/alpha?week=2026-10-05')
  })

  it('uses the phone layout on a tablet, in its narrow column', async () => {
    mockViewport(700)

    const { wrapper } = await mountStudent()

    expect(wrapper.findAll('[data-test="summary-value"]')).toHaveLength(3)
    expect(wrapper.findAll('[role="radio"]').map((tab) => tab.text())).toEqual(['Sessions', 'First path', 'Events'])
    expect(wrapper.find('[data-test="metric-value"]').exists()).toBe(false)
  })

  describe('on a phone', () => {
    beforeEach(() => mockViewport(390))

    it('sums the measures up in one card, with Sessions, First path and Events as tabs', async () => {
      const { wrapper } = await mountStudent()

      const values = wrapper.findAll('[data-test="summary-value"]').map((v) => v.text())
      expect(values).toEqual(['2', '3 of 3', '61%'])
      const tabs = wrapper.findAll('[role="radio"]').map((tab) => tab.text())
      expect(tabs).toEqual(['Sessions', 'First path', 'Events'])
      expect(wrapper.find('[data-test="session-week"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="path-node"]').exists()).toBe(false)
    })

    it("shows the first path, and the student's own events, on their tabs", async () => {
      const { wrapper } = await mountStudent()

      await wrapper.get('[data-test="student-tab-firstPath"]').trigger('click')
      expect(wrapper.findAll('[data-test="path-node"]')).toHaveLength(3)

      await wrapper.get('[data-test="student-tab-events"]').trigger('click')
      await flushPromises()
      expect(eventGET).toHaveBeenCalledWith('/admin/events', { params: { query: { student_id: CAMILA, limit: 12, offset: 0 } } })
      expect(wrapper.get('[data-test="event-type"]').text()).toBe('practice.session_ended')
    })
  })

  it('offers a retry when the student cannot be loaded', async () => {
    coreGET.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) })

    const { wrapper } = await mountStudent()

    expect(wrapper.get('[data-test="error"]').text()).toContain("Couldn't load this student.")
  })
})
