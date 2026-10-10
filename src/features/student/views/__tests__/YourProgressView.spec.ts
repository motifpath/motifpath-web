import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { components } from '@/api/generated/core-domain'
import { i18n } from '@/i18n'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']
type NodeProgress = components['schemas']['PracticeNodeProgress']

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

function apiState<T>() {
  return { item: ref<T | null>(null), isLoading: ref(false), error: ref(false), retry: vi.fn() }
}

const overviewState = apiState<Overview>()
// One summary state per instrument, and one for "Any instrument" (null), so a switch can be seen.
const summaryStates = new Map<string | null, ReturnType<typeof apiState<Summary>>>()
const summaryFor = vi.fn((instrumentId: string | null) => {
  if (!summaryStates.has(instrumentId)) summaryStates.set(instrumentId, apiState<Summary>())
  return summaryStates.get(instrumentId)!
})
vi.mock('@/features/student/composables/usePracticeHome', () => ({
  usePracticeOverview: () => overviewState,
  usePracticeSummary: (instrumentId: string | null) => summaryFor(instrumentId),
}))

import YourProgressView from '@/features/student/views/YourProgressView.vue'

// Thursday 2026-10-08 to Wednesday 2026-10-14, today.
const WEEK = ['2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']

function overview(overrides: Partial<Overview> = {}): Overview {
  const learned = [0, 2, 3]
  return {
    practice_days_last_7: 4,
    learning_days_last_7: learned.length,
    minutes_practised_last_7: 48,
    minutes_practised_previous_7: 33,
    day_streak_current: 3,
    day_streak_best: 9,
    skills_up_last_7: 3,
    songs_played_total: 3,
    songs_played_last_7: 1,
    last_7_days: WEEK.map((date, index) => ({ date, practised: false, learned: learned.includes(index) })),
    instruments: [
      { instrument_id: GUITAR, practice_days_last_7: 3, top_next_step: null },
      { instrument_id: BASS, practice_days_last_7: 1, top_next_step: null },
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

function summary(instrumentId: string | null, practised: number[], overrides: Partial<Summary> = {}): Summary {
  return {
    instrument_id: instrumentId,
    student_instrument_ids: [GUITAR, BASS],
    practice_days_last_7: practised.length,
    last_7_days: WEEK.map((date, index) => ({ date, practised: practised.includes(index) })),
    progress_this_week: [],
    next_steps: [],
    next_steps_total: 0,
    groups: [{ area_node_id: 'area', any_instrument: false, names: { en: 'Chords' }, nodes: [skill('a', 'learning', true), skill('b', 'accurate'), skill('c', 'fluent')] }],
    ...overrides,
  }
}

const majorTriadsMoved = { node_id: 'major-triads', names: { en: 'Major triads' }, measure: 'accuracy' as const, before: 0.62, after: 0.85 }

const page = { template: '<div data-test="home-page" />' }

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: page },
      { path: '/progress', name: 'your-progress', component: YourProgressView },
    ],
  })
}

let wrapper: ReturnType<typeof mount> | null = null

async function openProgress(query: Record<string, string> = { instrument: GUITAR }, { fromHome = true } = {}) {
  const router = makeRouter()
  if (fromHome) await router.push({ name: 'home' })
  await router.push({ name: 'your-progress', query })
  wrapper = mount(YourProgressView, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

/** Seeds a summary for instrumentId before the page asks for it. */
function seedSummary(instrumentId: string | null, value: Summary) {
  summaryFor(instrumentId).item.value = value
}

const get = (test: string) => wrapper!.get(`[data-test="${test}"]`)
const find = (test: string) => wrapper!.find(`[data-test="${test}"]`)
const choice = (value: string) => get(`progress-instrument-${value}`)

beforeEach(() => {
  overviewState.item.value = overview()
  overviewState.error.value = false
  overviewState.isLoading.value = false
  summaryStates.clear()
  summaryFor.mockClear()
  seedSummary(GUITAR, summary(GUITAR, [0, 2, 6], { progress_this_week: [majorTriadsMoved] }))
  seedSummary(BASS, summary(BASS, [4]))
  seedSummary(null, summary(null, []))
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  i18n.global.locale.value = 'en'
})

describe('YourProgressView', () => {
  it('is titled Your progress', async () => {
    await openProgress()

    expect(get('your-progress').find('h1').text()).toBe('Your progress')
  })

  describe('Your progress shows skills up with the other This week tiles', () => {
    it('shows minutes, the day streak, songs and skills up, worded as on the home', async () => {
      await openProgress()

      const tiles = get('progress-week').findAll('[data-test^="tile-"]').map((tile) => tile.attributes('data-test'))
      expect(tiles).toEqual(['tile-minutes', 'tile-streak', 'tile-songs', 'tile-skills-up'])
      expect(get('tile-minutes').text()).toContain('48')
      expect(get('tile-minutes').text()).toContain('+15 vs last wk')
      expect(get('tile-streak').text()).toContain('Best: 9')
      expect(get('tile-songs').text()).toContain('+1 this week')
      expect(get('tile-skills-up').text()).toContain('Skills up')
      expect(get('tile-skills-up').text()).toContain('3')
      expect(get('tile-skills-up').text()).toContain('this week')
    })

    it('doesn’t link the tiles anywhere: this is already the page they open', async () => {
      await openProgress()

      expect(get('progress-week').findAll('a')).toHaveLength(0)
    })
  })

  describe('This week and learning days on Your progress stay put when the instrument changes', () => {
    it('shows This week and learning days above the instrument choice, as across instruments', async () => {
      await openProgress()

      const order = wrapper!.findAll('[data-test^="progress-"]').map((block) => block.attributes('data-test'))
      expect(order.indexOf('progress-week')).toBeLessThan(order.indexOf('progress-instruments'))
      expect(order.indexOf('progress-learning-days')).toBeLessThan(order.indexOf('progress-instruments'))
      expect(get('progress-week').text()).toContain('All instruments')
      expect(get('progress-learning-days').text()).toContain('Learning days · 3 of 7')
    })

    it('keeps the same numbers after choosing another instrument', async () => {
      await openProgress()
      const before = [get('progress-week').text(), get('progress-learning-days').text()]

      await choice(BASS).trigger('click')
      await flushPromises()

      expect([get('progress-week').text(), get('progress-learning-days').text()]).toEqual(before)
    })
  })

  describe('Your progress offers only the student’s own instruments and "Any instrument"', () => {
    it('offers guitar, electric bass and Any instrument, and nothing that sums every instrument', async () => {
      await openProgress()

      const options = get('progress-instruments').findAll('[role="radio"]').map((option) => option.text())
      expect(options).toEqual(['Guitar', 'Electric bass', 'Any instrument'])
      expect(options.join(' ')).not.toMatch(/\bAll\b/)
    })
  })

  describe('opening on an instrument', () => {
    it('opens on the instrument it was asked for', async () => {
      await openProgress({ instrument: BASS })

      expect(choice(BASS).attributes('aria-checked')).toBe('true')
      expect(summaryFor).toHaveBeenCalledWith(BASS)
    })

    it('opens on the student’s first instrument when none was chosen', async () => {
      await openProgress({})

      expect(choice(GUITAR).attributes('aria-checked')).toBe('true')
    })

    it('opens on the student’s first instrument when the one asked for isn’t theirs', async () => {
      await openProgress({ instrument: '99999999-9999-4999-8999-999999999999' })

      expect(choice(GUITAR).attributes('aria-checked')).toBe('true')
    })
  })

  describe('Your progress switches between the student’s instruments', () => {
    it('shows electric bass’s practice days, skills and what moved after choosing it', async () => {
      await openProgress()

      await choice(BASS).trigger('click')
      await flushPromises()

      expect(summaryFor).toHaveBeenLastCalledWith(BASS)
      expect(get('progress-practice-days').text()).toContain('Practice days · 1 of 7')
      expect(get('progress-moved').text()).not.toContain('Major triads')
    })

    it('remembers the choice in the address without adding a page, so Back still goes home', async () => {
      const { router } = await openProgress()

      await choice(BASS).trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.query.instrument).toBe(BASS)

      await get('your-progress-back').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('home')
    })
  })

  describe('Any instrument shows the skills that suit every instrument', () => {
    it('reads the summary with no instrument', async () => {
      const { router } = await openProgress()

      await choice('any').trigger('click')
      await flushPromises()

      expect(summaryFor).toHaveBeenLastCalledWith(null)
      expect(router.currentRoute.value.query.instrument).toBe('any')
    })

    it('opens on Any instrument when asked for it', async () => {
      await openProgress({ instrument: 'any' })

      expect(choice('any').attributes('aria-checked')).toBe('true')
      expect(summaryFor).toHaveBeenCalledWith(null)
    })
  })

  describe('Day rows show the last 7 days with today last and marked', () => {
    it('shows the instrument’s practice days by weekday, with today marked', async () => {
      await openProgress()

      const row = get('progress-practice-days')
      expect(row.text()).toContain('Practice days · 3 of 7')
      expect(row.findAll('[data-test="week-day-letter"]').map((letter) => letter.text())).toEqual(['T', 'F', 'S', 'S', 'M', 'T', 'W'])
      const marks = row.findAll('[data-test="week-day-mark"]')
      expect(marks.map((mark) => mark.attributes('data-filled'))).toEqual(['true', 'false', 'true', 'false', 'false', 'false', 'true'])
      expect(marks.at(-1)!.attributes('data-today')).toBe('true')
    })

    it('never calls practice days a streak', async () => {
      await openProgress()

      expect(get('progress-practice-days').text().toLowerCase()).not.toContain('streak')
    })
  })

  describe('Your skills on the chosen instrument', () => {
    it('counts the skills at each level and the fading ones', async () => {
      await openProgress()

      const legend = get('progress-skills').findAll('[data-test="level-legend-item"]').map((item) => item.text())
      expect(legend).toEqual(['1 learning', '1 accurate', '1 fluent', '0 retained'])
      expect(get('progress-skills').text()).toContain('1 fading — refresh it')
    })

    it('has no See all, since this is the page it would open', async () => {
      await openProgress()

      expect(find('skills-see-all').exists()).toBe(false)
    })
  })

  describe('Moved this week shows each improved skill from where it started', () => {
    it('shows major triads, accuracy 62% → 85%', async () => {
      await openProgress()

      const row = get('progress-moved')
      expect(row.text()).toContain('Moved this week')
      expect(row.get('[data-test="skill-progress-name"]').text()).toBe('Major triads')
      expect(row.get('[data-test="skill-progress-measure"]').text()).toBe('Accuracy')
      expect(row.get('[data-test="skill-progress-change"]').text()).toBe('62% → 85%')
    })
  })

  describe('A week where nothing moved says so kindly', () => {
    it('says nothing moved yet and invites a session', async () => {
      await openProgress({ instrument: BASS })

      expect(get('progress-moved').text()).toContain('Nothing has moved yet this week. A session will show it here.')
    })
  })

  describe('A summary that fails to load on Your progress keeps This week and learning days', () => {
    it('offers a retry for the instrument’s blocks and still shows the rest', async () => {
      summaryFor(GUITAR).item.value = null
      summaryFor(GUITAR).error.value = true
      await openProgress()

      expect(find('progress-practice-days').exists()).toBe(false)
      const failed = get('progress-instrument')
      expect(failed.text()).toContain("We couldn't load your progress on this instrument.")
      await failed.get('button').trigger('click')
      expect(summaryFor(GUITAR).retry).toHaveBeenCalled()
      expect(get('progress-week').text()).toContain('48')
      expect(get('progress-learning-days').text()).toContain('3 of 7')
    })
  })

  describe('an overview that fails to load', () => {
    it('offers a retry for This week and still shows the instrument it was opened on', async () => {
      overviewState.item.value = null
      overviewState.error.value = true
      await openProgress({ instrument: BASS })

      expect(get('progress-week').text()).toContain("We couldn't load this week.")
      expect(get('progress-practice-days').text()).toContain('1 of 7')
    })
  })

  describe('Back from Your progress returns to the home', () => {
    it('goes back to the home it was opened from', async () => {
      const { router } = await openProgress()

      await get('your-progress-back').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('home')
    })

    it('goes to the home when opened directly, with nothing to go back to', async () => {
      const { router } = await openProgress({ instrument: GUITAR }, { fromHome: false })

      await get('your-progress-back').trigger('click')
      await flushPromises()

      expect(router.currentRoute.value.name).toBe('home')
    })
  })

  describe('in pt-BR', () => {
    it('reads its labels in Portuguese', async () => {
      i18n.global.locale.value = 'pt-BR'
      await openProgress()

      expect(get('your-progress').find('h1').text()).toBe('Seu progresso')
      expect(get('tile-skills-up').text()).toContain('Habilidades em alta')
      expect(get('progress-learning-days').text()).toContain('Dias de estudo · 3 de 7')
      expect(get('progress-practice-days').text()).toContain('Dias de prática · 3 de 7')
      expect(get('progress-instruments').text()).toContain('Violão')
      expect(get('progress-moved').text()).toContain('Avançou esta semana')
    })
  })
})
