import { enableAutoUnmount, flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type Overview = components['schemas']['PracticeOverview']
type Summary = components['schemas']['PracticeSummary']

const GUITAR = '22222222-2222-4222-8222-222222222222'
const BASS = '33333333-3333-4333-8333-333333333333'

const instruments = {
  instruments: ref([
    { instrument_id: GUITAR, names: { en: 'Acoustic guitar' }, family: 'fretted', icon: 'acoustic_guitar', languages: ['en'] },
    { instrument_id: BASS, names: { en: 'Electric bass' }, family: 'fretted', icon: 'electric_bass', languages: ['en'] },
  ]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => instruments,
}))

const overviewState = {
  item: ref<Overview | null>(null),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
const summaries = new Map<string, Summary>()
const summaryFor = vi.fn((instrumentId: string) => ({
  item: ref(summaries.get(instrumentId) ?? null),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}))
vi.mock('@/features/student/composables/usePracticeHome', () => ({
  usePracticeOverview: () => overviewState,
  usePracticeSummary: (instrumentId: string) => summaryFor(instrumentId),
  useFretboardMap: () => ({ item: ref(null), isLoading: ref(false), error: ref(false), retry: vi.fn() }),
}))

import FretboardHeatmap from '@/features/student/components/FretboardHeatmap.vue'
import PracticeDashboard from '@/features/student/components/PracticeDashboard.vue'
import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'

const names = (en: string) => ({ en })

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    practice_days_last_7: 2,
    learning_days_last_7: 3,
    minutes_practised_last_7: 0,
    minutes_practised_previous_7: 0,
    day_streak_current: 0,
    day_streak_best: 0,
    skills_up_last_7: 0,
    songs_played_total: 0,
    songs_played_last_7: 0,
    instruments: [
      { instrument_id: GUITAR, practice_days_last_7: 2, top_next_step: { kind: 'refresh', node_id: 'n-1', names: names('Open chords') } },
      { instrument_id: BASS, practice_days_last_7: 0, top_next_step: null },
    ],
    ...overrides,
  }
}

function summary(overrides: Partial<Summary> = {}): Summary {
  return {
    instrument_id: GUITAR,
    student_instrument_ids: [GUITAR, BASS],
    practice_days_last_7: 2,
    progress_this_week: [
      { node_id: 'n-2', names: names('Alternate picking'), measure: 'accuracy', before: 0.72, after: 0.86 },
      { node_id: 'n-3', names: names('Pentatonic run'), measure: 'best_clean_tempo_bpm', before: 80, after: 92 },
    ],
    next_steps: [
      { kind: 'refresh', node_id: 'n-1', names: names('Open chords'), level: 'fluent' },
      { kind: 'strengthen', node_id: 'n-2', names: names('Alternate picking'), level: 'learning' },
      { kind: 'ready_to_start', node_id: 'n-4', names: names('Barre chords') },
    ],
    next_steps_total: 5,
    groups: [
      {
        area_node_id: 'a-1',
        any_instrument: false,
        names: names('Technique'),
        nodes: [
          {
            node_id: 'n-2',
            names: names('Alternate picking'),
            level: 'learning',
            fading: false,
            coverage: { met_count: 1, item_count: 4 },
            child_node_ids: [],
            readiness: { met_count: 0, required_count: 0 },
          },
          {
            node_id: 'n-5',
            names: names('Chords'),
            level: null,
            fading: false,
            coverage: { met_count: 3, item_count: 10 },
            child_node_ids: ['n-1'],
            readiness: { met_count: 0, required_count: 0 },
          },
          {
            node_id: 'n-1',
            names: names('Open chords'),
            level: 'fluent',
            fading: true,
            coverage: { met_count: 3, item_count: 3 },
            child_node_ids: [],
            readiness: { met_count: 0, required_count: 0 },
          },
        ],
      },
      {
        area_node_id: null,
        any_instrument: true,
        names: names('Any instrument'),
        nodes: [
          {
            node_id: 'n-6',
            names: names('Intervals'),
            level: 'new',
            fading: false,
            coverage: { met_count: 0, item_count: 2 },
            child_node_ids: [],
            readiness: { met_count: 0, required_count: 0 },
          },
        ],
      },
    ],
    ...overrides,
  }
}

function mountHome() {
  return mount(PracticeDashboard, { global: { stubs: { RouterLink: RouterLinkStub } } })
}

function tabs(wrapper: ReturnType<typeof mountHome>) {
  return wrapper.findAll('[role="tab"]')
}

async function openTab(wrapper: ReturnType<typeof mountHome>, label: string) {
  const tab = tabs(wrapper).find((candidate) => candidate.text() === label)
  if (!tab) throw new Error(`no tab ${label}`)
  await tab.trigger('click')
  await flushPromises()
}

function startLink(wrapper: ReturnType<typeof mountHome>) {
  return wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-test') === 'start-practising')!
}

enableAutoUnmount(afterEach)

describe('PracticeDashboard', () => {
  beforeEach(() => {
    overviewState.item.value = overview()
    overviewState.isLoading.value = false
    overviewState.error.value = false
    overviewState.retry.mockReset()
    summaries.clear()
    summaries.set(GUITAR, summary())
    summaries.set(BASS, summary({ instrument_id: BASS, progress_this_week: [], next_steps: [], next_steps_total: 0, groups: [] }))
    summaryFor.mockClear()
    localStorage.clear()
  })

  it('opens on the overview, then one tab per instrument', () => {
    const wrapper = mountHome()

    expect(tabs(wrapper).map((tab) => tab.text())).toEqual(['Overview', 'Acoustic guitar', 'Electric bass'])
    expect(tabs(wrapper)[0]!.attributes('aria-selected')).toBe('true')
  })

  it('counts practice and learning days in the last 7, as marks, never a streak', () => {
    const wrapper = mountHome()

    const practice = wrapper.get('[data-test="practice-days"]')
    expect(practice.text()).toContain('2 of the last 7 days')
    expect(practice.findAll('[data-test="day-mark"]').map((mark) => mark.attributes('data-filled'))).toEqual([
      'true',
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
    ])
    expect(wrapper.get('[data-test="learning-days"]').text()).toContain('3 of the last 7 days')
    expect(wrapper.text().toLowerCase()).not.toContain('streak')
  })

  it('shows a card per instrument with its practice days and its top next step, opening its tab', async () => {
    const wrapper = mountHome()

    const cards = wrapper.findAll('[data-test="instrument-card"]')
    expect(cards.map((card) => card.text())).toEqual([
      expect.stringContaining('Acoustic guitar'),
      expect.stringContaining('Electric bass'),
    ])
    expect(cards[0]!.text()).toContain('Refresh: Open chords')
    expect(cards[1]!.text()).toContain('Nothing to suggest yet')

    await cards[1]!.trigger('click')
    expect(tabs(wrapper)[2]!.attributes('aria-selected')).toBe('true')
  })

  it('shows an instrument’s summary in its tab', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Acoustic guitar')

    expect(summaryFor).toHaveBeenCalledWith(GUITAR)
    expect(wrapper.get('[data-test="practice-days"]').text()).toContain('2 of the last 7 days')
  })

  it('shows the instrument’s fretboard map in its tab', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Electric bass')

    expect(wrapper.getComponent(FretboardHeatmap).props('instrumentId')).toBe(BASS)
  })

  it('shows what improved this week with both values', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Acoustic guitar')

    const lines = wrapper.findAll('[data-test="progress-line"]').map((line) => line.text())
    expect(lines[0]).toContain('Alternate picking')
    expect(lines[0]).toContain('Accuracy 72% → 86%')
    expect(lines[1]).toContain('Best clean tempo 80 → 92 BPM')
  })

  it('says when nothing improved yet this week', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Electric bass')

    expect(wrapper.get('[data-test="progress"]').text()).toContain('Nothing has moved yet this week')
  })

  it('suggests the top three next steps, with a way to see them all', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Acoustic guitar')

    expect(wrapper.findAll('[data-test="next-step"]').map((step) => step.text())).toEqual([
      expect.stringContaining('Refresh'),
      expect.stringContaining('Strengthen'),
      expect.stringContaining('Ready to start'),
    ])
    expect(wrapper.get('[data-test="see-all-steps"]').text()).toBe('See all (5)')
    expect(wrapper.get('[data-test="see-all-steps"]').attributes('href')).toBe('#practice-skills')
  })

  it('offers no “see all” when the three are all there is', async () => {
    summaries.set(GUITAR, summary({ next_steps_total: 3 }))
    const wrapper = mountHome()
    await openTab(wrapper, 'Acoustic guitar')

    expect(wrapper.find('[data-test="see-all-steps"]').exists()).toBe(false)
  })

  it('lists every skill by area with its level, coverage for a wide one, and fading', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Acoustic guitar')

    const groups = wrapper.findAll('[data-test="skill-group"]')
    expect(groups.map((group) => group.get('h3').text())).toEqual(['Technique', 'Any instrument'])
    const nodes = groups[0]!.findAll('[data-test="skill-node"]')
    expect(nodes[0]!.get('[data-test="level-chip"]').text()).toBe('Learning')
    expect(nodes[0]!.get('[data-test="level-chip"]').classes()).not.toEqual(expect.arrayContaining([expect.stringMatching(/danger/)]))
    expect(nodes[1]!.find('[data-test="level-chip"]').exists()).toBe(false)
    expect(nodes[1]!.text()).toContain('3 of 10 met')
    expect(nodes[2]!.text()).toContain('Fading')
  })

  it('says when an instrument has nothing to practise yet', async () => {
    const wrapper = mountHome()
    await openTab(wrapper, 'Electric bass')

    expect(wrapper.get('[data-test="skills-empty"]').text()).toContain('Nothing to practise on this instrument yet')
  })

  it('remembers the tab last opened', async () => {
    const first = mountHome()
    await openTab(first, 'Electric bass')
    first.unmount()

    const again = mountHome()
    expect(tabs(again)[2]!.attributes('aria-selected')).toBe('true')
  })

  it('falls back to the overview when the remembered instrument is no longer the student’s', () => {
    localStorage.setItem('practiceHome.tab', 'gone')

    expect(tabs(mountHome())[0]!.attributes('aria-selected')).toBe('true')
  })

  it('still works when the browser won’t store anything', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const wrapper = mountHome()

    await openTab(wrapper, 'Electric bass')

    expect(tabs(wrapper)[2]!.attributes('aria-selected')).toBe('true')
    vi.restoreAllMocks()
  })

  it('starts practising in two taps: the setup knows the instrument of the tab open', async () => {
    const wrapper = mountHome()
    expect(startLink(wrapper).props('to')).toEqual({ name: 'practice-session' })

    await openTab(wrapper, 'Electric bass')

    expect(startLink(wrapper).props('to')).toEqual({ name: 'practice-session', query: { instrument: BASS } })
  })

  describe('with no instrument of the student’s own', () => {
    // A path or course for every instrument adds none, yet its skills can still be practised.
    beforeEach(() => {
      overviewState.item.value = overview({ practice_days_last_7: 1, instruments: [] })
    })

    it('still shows the days and starts practising, the instrument chosen at the start', () => {
      const wrapper = mountHome()

      expect(wrapper.get('[data-test="practice-days"]').text()).toContain('1 of the last 7 days')
      expect(startLink(wrapper).props('to')).toEqual({ name: 'practice-session' })
      expect(tabs(wrapper)).toHaveLength(0)
    })

    it('says the instrument is chosen at the start, and offers to find a path', () => {
      const wrapper = mountHome()

      expect(wrapper.get('[data-test="no-instruments"]').text()).toContain('choose the instrument in your hands when you start')
      expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))).toContainEqual({ name: 'path-catalog' })
    })
  })

  it('says while the overview loads', () => {
    overviewState.item.value = null
    overviewState.isLoading.value = true

    expect(mountHome().findComponent(LoadingSkeleton).exists()).toBe(true)
  })

  it('says when the overview can’t be loaded, and tries again', async () => {
    overviewState.item.value = null
    overviewState.error.value = true
    const wrapper = mountHome()

    await wrapper.get('[data-test="retry"]').trigger('click')

    expect(overviewState.retry).toHaveBeenCalledOnce()
  })
})
