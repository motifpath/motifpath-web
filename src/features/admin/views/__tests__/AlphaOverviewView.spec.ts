import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import AlphaOverviewView from '@/features/admin/views/AlphaOverviewView.vue'
import { i18n } from '@/i18n'
import { ALPHA_NOW, makeAlphaObservation, makeAlphaStudent } from '@/shared/testUtils/alphaObservation'
import { mockViewport } from '@/shared/testUtils/viewport'

const TeachShellStub = { template: '<div><slot /></div>' }

const students = [
  makeAlphaStudent({ student_id: 's-lucas', display_name: 'Lucas Pereira', finished_sessions_in_week: 0, last_active_at: '2026-10-05T12:00:00Z', quiet: true }),
  makeAlphaStudent({ student_id: 's-beatriz', display_name: 'Beatriz Rocha', finished_sessions_in_week: 1 }),
  makeAlphaStudent({ student_id: 's-rafael', display_name: 'Rafael Nunes', finished_sessions_in_week: 1 }),
  makeAlphaStudent({ student_id: 's-camila', display_name: 'Camila Duarte', finished_sessions_in_week: 2 }),
  makeAlphaStudent({ student_id: 's-marina', display_name: 'Marina Alves', finished_sessions_in_week: 3, at_target_in_week: true }),
  makeAlphaStudent({ student_id: 's-thiago', display_name: 'Thiago Lima', finished_sessions_in_week: 3, at_target_in_week: true }),
  makeAlphaStudent({ student_id: 's-ana', display_name: 'Ana Clara Souza', finished_sessions_in_week: 4, at_target_in_week: true }),
]

const runningWeek = makeAlphaObservation({
  students,
  summary: {
    student_count: 7,
    at_target_in_week: 3,
    at_target_in_previous_week: 5,
    at_target_every_week: 3,
    first_path_over_target: 2,
    median_first_path_percent: 56,
  },
})

const lastWeek = makeAlphaObservation({
  ...runningWeek,
  week: { week_start: '2026-10-05', week_end: '2026-10-11', running: false },
})

function serve() {
  GET.mockImplementation((_path: string, init: { params: { query: { week?: string } } }) =>
    Promise.resolve({ data: init.params.query.week === '2026-10-05' ? lastWeek : runningWeek, response: new Response(null, { status: 200 }) }),
  )
}

async function mountOverview(path = '/admin/alpha') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/admin/alpha', name: 'admin-alpha', component: AlphaOverviewView },
      { path: '/admin/alpha/students/:studentId', name: 'admin-alpha-student', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  const wrapper = mount(AlphaOverviewView, { global: { plugins: [router], stubs: { TeachShell: TeachShellStub } } })
  await flushPromises()
  return { wrapper, router }
}

const names = (wrapper: Awaited<ReturnType<typeof mountOverview>>['wrapper']) =>
  wrapper.findAll('[data-test="observation-student"]').map((s) => s.attributes('data-name'))

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(ALPHA_NOW)
  mockViewport(1280)
  GET.mockReset()
  serve()
})

afterEach(() => {
  i18n.global.locale.value = 'en'
  vi.useRealTimers()
})

describe('AlphaOverviewView', () => {
  it('opens on the running week, which cannot be stepped past', async () => {
    const { wrapper } = await mountOverview()

    expect(GET).toHaveBeenCalledWith('/admin/alpha-observation', { params: { query: {} } })
    expect(wrapper.get('h1').text()).toBe('Engagement')
    expect(wrapper.get('[data-test="week-label"]').text()).toBe('This week · 12–18 Oct')
    expect(wrapper.text()).toContain('This week is still running.')
    expect(wrapper.get('[aria-label="Next week"]').attributes('disabled')).toBeDefined()
  })

  it('steps back to the week before, which is not running', async () => {
    const { wrapper, router } = await mountOverview()

    await wrapper.get('[aria-label="Previous week"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.query).toEqual({ week: '2026-10-05' })
    expect(GET).toHaveBeenLastCalledWith('/admin/alpha-observation', { params: { query: { week: '2026-10-05' } } })
    expect(wrapper.get('[data-test="week-label"]').text()).toBe('Last week · 5–11 Oct')
    expect(wrapper.text()).not.toContain('still running')
    expect(wrapper.get('[aria-label="Next week"]').attributes('disabled')).toBeUndefined()
  })

  it('shows both targets in four tiles', async () => {
    const { wrapper } = await mountOverview()

    const labels = wrapper.findAll('[data-test="metric-label"]').map((l) => l.text())
    const values = wrapper.findAll('[data-test="metric-value"]').map((v) => v.text())
    expect(labels).toEqual(['3+ sessions this week', '3+ every week so far', 'First path over 70%', 'Median first path'])
    expect(values).toEqual(['3 of 7', '3 of 7', '2 of 7', '56%'])
  })

  it('lists every student in the order the server gives, fewest sessions first', async () => {
    const { wrapper } = await mountOverview()

    expect(names(wrapper)).toEqual(students.map((s) => s.display_name))
    expect(wrapper.text()).toContain('7 students · fewest sessions this week first')
  })

  it('narrows the list with a chip, and every chip keeps its count', async () => {
    const { wrapper } = await mountOverview()

    await wrapper.get('[data-test="filter-belowTarget"]').trigger('click')

    expect(names(wrapper)).toEqual(['Lucas Pereira', 'Beatriz Rocha', 'Rafael Nunes', 'Camila Duarte'])
    const chips = wrapper.findAll('[data-test^="filter-"]').map((c) => c.text())
    expect(chips).toEqual(['All · 7', 'Below 3 this week · 4', 'Quiet 7+ days · 1'])
  })

  it('narrows the list by name', async () => {
    const { wrapper } = await mountOverview()

    await wrapper.get('[data-test="student-search"] input').setValue('rocha')

    expect(names(wrapper)).toEqual(['Beatriz Rocha'])
  })

  it('opens a student for the same week', async () => {
    const { wrapper } = await mountOverview('/admin/alpha?week=2026-10-05')

    const link = wrapper.get('[data-test="observation-student"][data-name="Camila Duarte"] a')

    expect(link.attributes('href')).toBe('/admin/alpha/students/s-camila?week=2026-10-05')
  })

  it('shows a row per student on a wide screen and a card per student on a phone', async () => {
    const wide = await mountOverview()
    expect(wide.wrapper.findAll('[data-test="observation-row"]')).toHaveLength(7)

    mockViewport(390)
    const narrow = await mountOverview()
    expect(narrow.wrapper.findAll('[data-test="observation-card"]')).toHaveLength(7)
    expect(narrow.wrapper.find('[data-test="observation-row"]').exists()).toBe(false)
  })

  it('says when no student is in the alpha yet, in place of the tiles and the list', async () => {
    GET.mockResolvedValue({ data: makeAlphaObservation({ students: [], summary: { ...runningWeek.summary, student_count: 0 } }) })

    const { wrapper } = await mountOverview()

    expect(wrapper.get('[data-test="empty"]').text()).toContain('No student is in the alpha yet.')
    expect(wrapper.find('[data-test="metric-value"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="observation-student"]').exists()).toBe(false)
  })

  it('offers a retry when the alpha cannot be loaded', async () => {
    GET.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) })

    const { wrapper } = await mountOverview()

    expect(wrapper.get('[data-test="error"]').text()).toContain("Couldn't load the alpha.")
    await wrapper.get('[data-test="retry"]').trigger('click')
    await flushPromises()
    expect(names(wrapper)).toHaveLength(7)
  })

  it('offers nothing to edit, add or delete', async () => {
    const { wrapper } = await mountOverview()

    const buttons = wrapper.findAll('button').map((b) => b.attributes('aria-label') ?? b.text())
    expect(buttons).toEqual(['Previous week', 'Next week', 'All · 7', 'Below 3 this week · 4', 'Quiet 7+ days · 1'])
    expect(wrapper.findAll('input')).toHaveLength(1)
  })

  it('reads in Portuguese', async () => {
    i18n.global.locale.value = 'pt-BR'

    const { wrapper } = await mountOverview()

    expect(wrapper.get('h1').text()).toBe('Engajamento')
    expect(wrapper.get('[data-test="week-label"]').text()).toBe('Esta semana · 12–18 out.')
    expect(wrapper.findAll('[data-test="metric-label"]')[0]!.text()).toBe('3+ sessões nesta semana')
    expect(wrapper.get('[data-test="filter-quiet"]').text()).toBe('Sem atividade há 7+ dias · 1')
  })
})
