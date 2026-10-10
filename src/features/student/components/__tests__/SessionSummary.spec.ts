import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { SummaryRow } from '@/features/student/utils/sessionSummary'

type Overview = components['schemas']['PracticeOverview']
type Item = components['schemas']['PracticeSessionItem']

const overviewState = { item: ref<Overview | null>(null), isLoading: ref(false), error: ref(false), retry: vi.fn() }
vi.mock('@/features/student/composables/usePracticeHome', () => ({
  usePracticeOverview: () => overviewState,
}))

import SessionSummary from '@/features/student/components/SessionSummary.vue'

function overview(overrides: Partial<Overview> = {}): Overview {
  return {
    practice_days_last_7: 3,
    learning_days_last_7: 2,
    minutes_practised_last_7: 59,
    minutes_practised_previous_7: 48,
    day_streak_current: 4,
    day_streak_best: 9,
    skills_up_last_7: 3,
    songs_played_total: 5,
    songs_played_last_7: 1,
    last_7_days: [],
    instruments: [],
    ...overrides,
  }
}

function item(itemKey: string, kind: Item['kind']): Item {
  return { item_key: itemKey, kind, reason: 'new', node_id: null, level: 'new', estimated_seconds: 30 }
}

const rows: SummaryRow[] = [
  { key: 'play_along:triads', item: item('play_along:triads', 'play_along'), result: { kind: 'played', fastestBpm: 76, rating: 'clean' }, good: true },
  { key: 'exercise:third', item: item('exercise:third', 'exercise'), result: { kind: 'answered', correct: true }, good: true },
  { key: 'fretboard_cell:name_the_note', item: item('fretboard_cell:x', 'fretboard_cell'), result: { kind: 'counted', right: 6, answered: 8 }, good: true },
  { key: 'exercise:quality', item: item('exercise:quality', 'exercise'), result: { kind: 'answered', correct: false }, good: false },
]

const labels: Record<string, string> = {
  'play_along:triads': 'Major triads, region 1',
  'exercise:third': 'Hear the third',
  'fretboard_cell:x': 'Name the note',
  'exercise:quality': 'Major or minor?',
}

function mountSummary(props: Partial<{ rows: SummaryRow[]; minutes: number; instrumentName: string; itemCount: number }> = {}) {
  return mount(SessionSummary, {
    props: { rows, minutes: 11, instrumentName: 'Guitar', itemCount: 9, labelOf: (planItem: Item) => labels[planItem.item_key], ...props },
  })
}

describe('SessionSummary', () => {
  beforeEach(() => {
    overviewState.item.value = overview()
    overviewState.isLoading.value = false
    overviewState.error.value = false
    overviewState.retry.mockReset()
  })

  it('says what the run did: minutes, instrument and items', () => {
    const wrapper = mountSummary()

    expect(wrapper.get('h1').text()).toBe('Session done')
    expect(wrapper.get('[data-test="summary-meta"]').text()).toBe('11 min · Guitar · 9 items')
  })

  it('lists each item with how it went', () => {
    const wrapper = mountSummary()

    const lines = wrapper.findAll('[data-test="summary-row"]')
    expect(lines.map((line) => [line.get('[data-test="summary-row-name"]').text(), line.get('[data-test="summary-row-result"]').text()])).toEqual([
      ['Major triads, region 1', 'up to 76 BPM · Clean'],
      ['Hear the third', 'Right'],
      ['Name the note', '6 of 8 right'],
      ['Major or minor?', 'Not quite'],
    ])
  })

  it('marks each line with an icon, never colour alone', () => {
    const wrapper = mountSummary()

    const marks = wrapper.findAll('[data-test="summary-row"]').map((line) => line.attributes('data-good'))
    expect(marks).toEqual(['true', 'true', 'true', 'false'])
    expect(wrapper.findAll('svg.lucide-circle-check')).toHaveLength(3)
    expect(wrapper.findAll('svg.lucide-circle-x')).toHaveLength(1)
  })

  it('shows this week’s minutes and day streak', () => {
    const wrapper = mountSummary()

    expect(wrapper.get('[data-test="tile-minutes"]').text()).toContain('59')
    expect(wrapper.get('[data-test="tile-streak"]').text()).toContain('4')
    expect(wrapper.get('[data-test="tile-streak"]').text()).toContain('Best: 9')
  })

  it('still shows the results when this week’s numbers don’t load, and offers to retry them', async () => {
    overviewState.item.value = null
    overviewState.error.value = true
    const wrapper = mountSummary()

    expect(wrapper.find('[data-test="tile-minutes"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="summary-row"]')).toHaveLength(4)
    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(overviewState.retry).toHaveBeenCalledOnce()
  })

  it('says so plainly when nothing was answered or rated, with no score', () => {
    const wrapper = mountSummary({ rows: [], itemCount: 0, minutes: 2 })

    expect(wrapper.text()).toContain('Nothing answered or rated this time. Every session still counts.')
    expect(wrapper.find('[data-test="summary-row"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="summary-meta"]').text()).toBe('2 min · Guitar')
  })

  it('makes Done the primary action, and Practise again a quieter one', async () => {
    const wrapper = mountSummary()

    const done = wrapper.get('[data-primary-action]')
    expect(done.text()).toBe('Done')
    await done.trigger('click')
    expect(wrapper.emitted('done')).toEqual([[]])

    const again = wrapper.get('[data-test="practise-again"]')
    expect(again.attributes()).not.toHaveProperty('data-primary-action')
    await again.trigger('click')
    expect(wrapper.emitted('practiseAgain')).toEqual([[]])
  })
})
