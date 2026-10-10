import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { makeStudentPathItem, makeStudentPathView } from '@/features/student/testing/studentPathItem'
import { i18n } from '@/i18n'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']
type NodeProgress = components['schemas']['PracticeNodeProgress']
type StudentPathView = components['schemas']['StudentPathView']

const GUITAR = '22222222-2222-4222-8222-222222222222'
const BASS = '33333333-3333-4333-8333-333333333333'

vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([
      { instrument_id: GUITAR, names: { en: 'Guitar', pt_BR: 'Violão' }, family: 'fretted', icon: 'acoustic_guitar', languages: ['en'] },
      { instrument_id: BASS, names: { en: 'Electric bass', pt_BR: 'Baixo elétrico' }, family: 'fretted', icon: 'electric_bass', languages: ['en'] },
    ]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))

const overviewState = { item: ref<Overview | null>(null), isLoading: ref(false), error: ref(false), retry: vi.fn() }
const summaryState = { item: ref<Summary | null>(null), isLoading: ref(false), error: ref(false), retry: vi.fn() }
const summaryFor = vi.fn((instrumentId: string) => {
  void instrumentId
  return summaryState
})
vi.mock('@/features/student/composables/usePracticeHome', () => ({
  usePracticeOverview: () => overviewState,
  usePracticeSummary: (instrumentId: string) => summaryFor(instrumentId),
}))

const pathState = {
  data: ref<StudentPathView | null>(null),
  error: ref<'no-path' | 'load-failed' | null>(null),
  isLoading: ref(false),
  retry: vi.fn(),
}
vi.mock('@/features/student/composables/useStudentPath', () => ({ useStudentPath: () => pathState }))

import StudentHome from '@/features/student/components/StudentHome.vue'
import AppButton from '@/shared/components/AppButton.vue'

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    practice_days_last_7: 3,
    learning_days_last_7: 2,
    minutes_practised_last_7: 48,
    minutes_practised_previous_7: 33,
    day_streak_current: 3,
    day_streak_best: 9,
    skills_up_last_7: 3,
    songs_played_total: 5,
    songs_played_last_7: 1,
    instruments: [
      { instrument_id: GUITAR, practice_days_last_7: 3, top_next_step: { kind: 'refresh', node_id: 'major-triads', names: { en: 'Major triads', pt_BR: 'Tríades maiores' } } },
      { instrument_id: BASS, practice_days_last_7: 0, top_next_step: null },
    ],
    ...overrides,
  }
}

function skill(nodeId: string, level: NodeProgress['level'], fading = false): NodeProgress {
  return {
    node_id: nodeId,
    names: { en: nodeId },
    level,
    fading,
    coverage: { met_count: 0, item_count: 0 },
    child_node_ids: [],
    readiness: { met_count: 0, required_count: 0 },
  }
}

/** On guitar: 5 learning, 7 accurate, 4 fluent and 2 retained, 2 of them fading. */
function guitarSummary(): Summary {
  const levels: [NodeProgress['level'], number][] = [
    ['learning', 5],
    ['accurate', 7],
    ['fluent', 4],
    ['retained', 2],
  ]
  const nodes = levels.flatMap(([level, count]) => Array.from({ length: count }, (_, index) => skill(`${level}-${index}`, level)))
  nodes[0] = { ...nodes[0]!, fading: true }
  nodes[6] = { ...nodes[6]!, fading: true }
  return {
    instrument_id: GUITAR,
    student_instrument_ids: [GUITAR, BASS],
    practice_days_last_7: 3,
    progress_this_week: [],
    next_steps: [],
    next_steps_total: 0,
    groups: [{ area_node_id: 'area', any_instrument: false, names: { en: 'Chords' }, nodes }],
  }
}

/** "Guitar fundamentals": 8 of 14 steps done; the next is the lesson "Inversions". */
function guitarFundamentals(): StudentPathView {
  const items = Array.from({ length: 14 }, (_, index) => makeStudentPathItem(index + 1, undefined, index < 8 ? 'completed' : 'not_started'))
  items[8] = { ...items[8]!, title: 'Inversions', content_node_id: 'inversions-node' }
  return makeStudentPathView(items, { title: 'Guitar fundamentals' })
}

const page = { template: '<div />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: page },
      { path: '/practice/session', name: 'practice-session', component: page },
      { path: '/path', name: 'path', component: page },
      { path: '/path/nodes/:nodeId', name: 'node', component: page },
      { path: '/paths', name: 'path-catalog', component: page },
      { path: '/progress', name: 'your-progress', component: page },
    ],
  })
}

let wrapper: ReturnType<typeof mount> | null = null

async function openHome() {
  const router = makeRouter()
  await router.push('/')
  wrapper = mount(StudentHome, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

beforeEach(() => {
  overviewState.item.value = overview()
  overviewState.error.value = false
  overviewState.isLoading.value = false
  summaryState.item.value = guitarSummary()
  summaryState.error.value = false
  summaryState.isLoading.value = false
  pathState.data.value = guitarFundamentals()
  pathState.error.value = null
  pathState.isLoading.value = false
  summaryFor.mockClear()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  i18n.global.locale.value = 'en'
  vi.useRealTimers()
})

const block = (name: string) => wrapper!.get(`[data-test="home-${name}"]`)
const tile = (name: string) => wrapper!.get(`[data-test="tile-${name}"]`)

describe('StudentHome', () => {
  describe('The home leads with today’s practice and its only primary action', () => {
    it('opens on refreshing major triads on guitar', async () => {
      await openHome()

      const blocks = wrapper!.findAll('[data-test^="home-"]').map((element) => element.attributes('data-test'))
      expect(blocks[0]).toBe('home-today')
      expect(block('today').text()).toContain('Today’s practice · Guitar')
      expect(block('today').text()).toContain('Refresh: Major triads')
      expect(block('today').text()).toContain('About 10 minutes')
    })

    it('has Start practice as its only primary action, opening the session on that instrument', async () => {
      await openHome()

      const primaries = wrapper!.findAllComponents(AppButton).filter((button) => button.props('variant') === 'primary')
      expect(primaries).toHaveLength(1)
      expect(primaries[0]!.text()).toBe('Start practice')
      expect(primaries[0]!.attributes('href')).toBe(`/practice/session?instrument=${GUITAR}`)
    })
  })

  describe('Your path shows its progress and the next step', () => {
    it('shows "Guitar fundamentals", 8 of 14, and "Inversions" as up next', async () => {
      await openHome()

      expect(wrapper!.get('[data-test="path-card-name"]').text()).toBe('Guitar fundamentals')
      expect(wrapper!.get('[data-test="path-card-count"]').text()).toBe('8 of 14')
      expect(wrapper!.get('[data-test="path-card-next-title"]').text()).toContain('Inversions')
      expect(wrapper!.get('[data-test="path-card-next-meta"]').text()).toBe('Up next · Video')
    })
  })

  describe('Tapping the path card opens the next step', () => {
    it('opens the lesson "Inversions"', async () => {
      await openHome()

      expect(wrapper!.get('[data-test="path-card"]').attributes('href')).toBe('/path/nodes/inversions-node')
    })
  })

  describe('This week shows minutes, day streak and songs played', () => {
    it('shows 48 minutes 15 more than the week before, a day streak of 3 best 9, and 5 songs 1 more this week', async () => {
      await openHome()

      expect(tile('minutes').text()).toContain('48')
      expect(tile('minutes').get('[data-test="metric-caption"]').text()).toBe('+15 vs last wk')
      expect(tile('streak').get('[data-test="metric-value"]').text()).toBe('3')
      expect(tile('streak').get('[data-test="metric-caption"]').text()).toBe('Best: 9')
      expect(tile('songs').get('[data-test="metric-value"]').text()).toBe('5')
      expect(tile('songs').get('[data-test="metric-caption"]').text()).toBe('+1 this week')
    })
  })

  describe('Your skills counts the skills at each level on today’s practice instrument', () => {
    it('reads the summary of guitar, today’s practice instrument', async () => {
      await openHome()

      expect(summaryFor).toHaveBeenCalledWith(GUITAR)
      expect(block('skills').text()).toContain('Guitar')
    })

    it('shows 5 learning, 7 accurate, 4 fluent and 2 retained, and says 2 are fading', async () => {
      await openHome()

      const legend = wrapper!.findAll('[data-test="level-legend-item"]').map((item) => item.text())
      expect(legend).toEqual(['5 learning', '7 accurate', '4 fluent', '2 retained'])
      expect(block('skills').text()).toContain('2 fading — refresh them')
    })

    it('has no fading chip when nothing is fading', async () => {
      summaryState.item.value = { ...guitarSummary(), groups: [{ area_node_id: 'a', any_instrument: false, names: { en: 'A' }, nodes: [skill('x', 'fluent')] }] }
      await openHome()

      expect(block('skills').text()).not.toContain('fading')
    })
  })

  describe('See all opens Your progress', () => {
    it('opens Your progress on guitar', async () => {
      await openHome()

      expect(wrapper!.get('[data-test="skills-see-all"]').attributes('href')).toBe(`/progress?instrument=${GUITAR}`)
    })
  })

  describe('Tapping a This week tile opens Your progress', () => {
    it('opens Your progress on guitar from each tile', async () => {
      await openHome()

      for (const name of ['minutes', 'streak', 'songs']) {
        expect(tile(name).attributes('href')).toBe(`/progress?instrument=${GUITAR}`)
      }
    })
  })

  describe('No current streak invites the student to start one', () => {
    it('invites a streak today, still shows the best, and never says a streak was lost', async () => {
      overviewState.item.value = overview({ day_streak_current: 0, day_streak_best: 9 })
      await openHome()

      expect(tile('streak').get('[data-test="metric-value"]').text()).toBe('0')
      expect(tile('streak').get('[data-test="metric-caption"]').text()).toBe('Start one today · best 9')
      expect(tile('streak').text().toLowerCase()).not.toMatch(/lost|broke|ended/)
    })
  })

  describe('A streak is never shown in a warning colour', () => {
    it('uses the same colours as the other tiles', async () => {
      overviewState.item.value = overview({ day_streak_current: 0 })
      await openHome()

      expect(tile('streak').classes()).toEqual(tile('minutes').classes())
      expect(tile('streak').html()).not.toMatch(/warning|danger/)
    })
  })

  describe('Fewer minutes than the week before are shown without alarm', () => {
    it('shows 20 and the change in a neutral colour', async () => {
      overviewState.item.value = overview({ minutes_practised_last_7: 20, minutes_practised_previous_7: 45 })
      await openHome()

      const caption = tile('minutes').get('[data-test="metric-caption"]')
      expect(tile('minutes').get('[data-test="metric-value"]').text()).toBe('20')
      expect(caption.text()).toBe('25 fewer than last wk')
      expect(caption.classes()).toContain('text-ink-muted')
      expect(tile('minutes').html()).not.toMatch(/warning|danger/)
    })
  })

  describe('A student who has played no song yet sees 0 songs without alarm', () => {
    it('shows 0 in the same colours as the other tiles', async () => {
      overviewState.item.value = overview({ songs_played_total: 0, songs_played_last_7: 0 })
      await openHome()

      expect(tile('songs').get('[data-test="metric-value"]').text()).toBe('0')
      expect(tile('songs').classes()).toEqual(tile('minutes').classes())
      expect(tile('songs').html()).not.toMatch(/warning|danger/)
    })
  })

  describe('A student with no path has no path card', () => {
    it('has no path card and invites the student to find a path', async () => {
      pathState.data.value = null
      pathState.error.value = 'no-path'
      await openHome()

      expect(wrapper!.find('[data-test="path-card"]').exists()).toBe(false)
      expect(wrapper!.get('[data-test="find-path"]').attributes('href')).toBe('/paths')
    })
  })

  describe('A student with no instruments sees This week and no Your skills', () => {
    it('shows This week and has no Your skills block', async () => {
      overviewState.item.value = overview({ instruments: [] })
      await openHome()

      expect(wrapper!.find('[data-test="home-week"]').exists()).toBe(true)
      expect(wrapper!.find('[data-test="home-skills"]').exists()).toBe(false)
      expect(summaryFor).not.toHaveBeenCalled()
    })

    it('still offers Start practice, choosing the instrument at the start', async () => {
      overviewState.item.value = overview({ instruments: [] })
      await openHome()

      const start = wrapper!.findAllComponents(AppButton).find((button) => button.props('variant') === 'primary')
      expect(start!.attributes('href')).toBe('/practice/session')
    })
  })

  describe('The home reads in pt-BR without truncating its labels', () => {
    it('shows every tile label and the path card’s step in full', async () => {
      i18n.global.locale.value = 'pt-BR'
      await openHome()

      expect(block('today').text()).toContain('Prática de hoje · Violão')
      expect(tile('minutes').get('[data-test="metric-label"]').text()).toBe('Minutos')
      expect(tile('streak').get('[data-test="metric-label"]').text()).toBe('Dias seguidos')
      expect(tile('songs').get('[data-test="metric-label"]').text()).toBe('Músicas')
      expect(wrapper!.get('[data-test="path-card-next-meta"]').text()).toBe('A seguir · Vídeo')
      expect(wrapper!.find('.truncate').exists()).toBe(false)
    })
  })

  describe('An overview that fails to load offers a retry and keeps the rest of the home', () => {
    it('says today’s practice and This week couldn’t load, offers a retry, and still shows Your path', async () => {
      overviewState.item.value = null
      overviewState.error.value = true
      await openHome()

      expect(block('today').find('[data-test="retry"]').exists()).toBe(true)
      expect(block('week').find('[data-test="retry"]').exists()).toBe(true)
      expect(wrapper!.find('[data-test="path-card"]').exists()).toBe(true)

      await block('today').get('[data-test="retry"]').trigger('click')
      expect(overviewState.retry).toHaveBeenCalled()
    })
  })

  describe('A summary that fails to load hides only Your skills', () => {
    it('says Your skills couldn’t load and offers a retry, while the rest still shows', async () => {
      summaryState.item.value = null
      summaryState.error.value = true
      await openHome()

      expect(block('skills').find('[data-test="retry"]').exists()).toBe(true)
      expect(block('today').text()).toContain('Refresh: Major triads')
      expect(wrapper!.find('[data-test="path-card"]').exists()).toBe(true)
      expect(wrapper!.find('[data-test="tile-minutes"]').exists()).toBe(true)
    })
  })

  describe('a path that fails to load', () => {
    it('offers a retry in place of the path card and keeps the rest', async () => {
      pathState.data.value = null
      pathState.error.value = 'load-failed'
      await openHome()

      expect(block('path').find('[data-test="retry"]').exists()).toBe(true)
      expect(block('today').text()).toContain('Refresh: Major triads')
    })
  })

  describe('greeting', () => {
    it.each([
      [8, 'Good morning'],
      [14, 'Good afternoon'],
      [20, 'Good evening'],
    ])('at %i:00 says "%s"', async (hour, greeting) => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date(2026, 9, 10, hour, 0))
      await openHome()

      expect(wrapper!.get('h1').text()).toBe(greeting)
    })
  })
})
