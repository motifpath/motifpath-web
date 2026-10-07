import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type FretboardMap = components['schemas']['FretboardMap']
type Level = components['schemas']['KnowledgeLevel']

const GUITAR = '22222222-2222-4222-8222-222222222222'
const ELECTRIC = '44444444-4444-4444-8444-444444444444'
const PIANO = '55555555-5555-4555-8555-555555555555'
const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

const instruments = {
  instruments: ref([
    { instrument_id: GUITAR, names: { en: 'Acoustic guitar' }, family: 'fretted', icon: 'acoustic_guitar', languages: ['en'], tuning: STANDARD },
    { instrument_id: ELECTRIC, names: { en: 'Electric guitar' }, family: 'fretted', icon: 'electric_guitar', languages: ['en'], tuning: STANDARD },
    { instrument_id: PIANO, names: { en: 'Piano' }, family: 'keyboard', icon: 'piano', languages: ['en'] },
  ]),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => instruments,
}))

const mapState = {
  item: ref<FretboardMap | null>(null),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
const mapFor = vi.fn<(instrumentId: string) => typeof mapState>(() => mapState)
vi.mock('@/features/student/composables/usePracticeHome', () => ({
  useFretboardMap: (instrumentId: string) => mapFor(instrumentId),
}))

import FretboardHeatmap from '@/features/student/components/FretboardHeatmap.vue'
import { MIN_COLUMN_GAP_WITH_NUT } from '@/shared/utils/fretboardGeometry'

/** Every cell of a 6-string layout at frets 0–11, new unless listed. */
function map(overrides: Record<string, { level: Level; fading?: boolean }> = {}, instrumentId = GUITAR): FretboardMap {
  const cells = [1, 2, 3, 4, 5, 6].flatMap((string) =>
    Array.from({ length: 12 }, (_, fret) => {
      const state = overrides[`${string}:${fret}`]
      return { item_key: `fretboard_cell:${GUITAR}:${string}:${fret}`, string, fret, level: state?.level ?? ('new' as Level), fading: state?.fading ?? false }
    }),
  )
  return { instrument_id: instrumentId, layout_instrument_id: GUITAR, cells }
}

function heatCells(wrapper: ReturnType<typeof mount>) {
  return wrapper.findAll('[data-test="heat-cell"]')
}

function cellAt(wrapper: ReturnType<typeof mount>, string: number, fret: number) {
  return heatCells(wrapper).find((cell) => cell.attributes('data-string') === `${string}` && cell.attributes('data-fret') === `${fret}`)!
}

enableAutoUnmount(afterEach)

describe('FretboardHeatmap', () => {
  beforeEach(() => {
    mapState.item.value = map({ '6:3': { level: 'accurate' }, '6:5': { level: 'fluent', fading: true } })
    mapState.isLoading.value = false
    mapState.error.value = false
    mapState.retry.mockReset()
    mapFor.mockClear()
  })

  it('loads the map of the instrument asked for', () => {
    mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })

    expect(mapFor).toHaveBeenCalledWith(GUITAR)
  })

  it('draws every cell of the layout, coloured by its level, from the nut to the last fret', async () => {
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.get('h2').text()).toBe('Your fretboard')
    expect(wrapper.findAll('[data-test="diagram-string"]')).toHaveLength(6)
    expect(heatCells(wrapper)).toHaveLength(72)
    expect(cellAt(wrapper, 6, 3).attributes('data-level')).toBe('accurate')
    expect(cellAt(wrapper, 1, 0).attributes('data-level')).toBe('new')
  })

  it('draws the board as diagrams do: wood grain, at a readable size that scrolls on a narrow screen', async () => {
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.find('[data-test="board-grain"]').exists()).toBe(true)
    expect(Number(wrapper.get('[data-test="fretboard-heatmap"] svg').attributes('width'))).toBeGreaterThanOrEqual(11 * MIN_COLUMN_GAP_WITH_NUT)
    expect(wrapper.get('[data-test="heatmap-scroll"]').classes()).toContain('overflow-x-auto')
  })

  it('rings a fading cell with a dashed line and names its place, level and fading for screen readers', async () => {
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.findAll('[data-test="fading-ring"]').map((ring) => `${ring.attributes('data-string')}:${ring.attributes('data-fret')}`)).toEqual(['6:5'])
    expect(wrapper.get('[data-test="fading-ring"]').attributes('stroke-dasharray')).toBeDefined()
    expect(cellAt(wrapper, 6, 5).attributes('aria-label')).toBe('String 6, fret 5: Fluent, fading')
    expect(cellAt(wrapper, 6, 3).attributes('aria-label')).toBe('String 6, fret 3: Accurate')
    expect(cellAt(wrapper, 4, 0).attributes('aria-label')).toBe('String 4, open: New')
  })

  it('explains every level and the fading mark in a legend', async () => {
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.findAll('[data-test="heat-legend"] li').map((entry) => entry.text())).toEqual([
      'New',
      'Learning',
      'Accurate',
      'Fluent',
      'Retained',
      'Fading',
    ])
  })

  it('draws an instrument sharing a layout on that layout’s tuning', async () => {
    mapState.item.value = map({ '6:3': { level: 'accurate' } }, ELECTRIC)
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: ELECTRIC } })
    await flushPromises()

    expect(wrapper.findAll('[data-test="diagram-string"]')).toHaveLength(6)
    expect(cellAt(wrapper, 6, 3).attributes('data-level')).toBe('accurate')
  })

  it('shows nothing for an instrument without a fretboard', async () => {
    mapState.item.value = { instrument_id: PIANO, layout_instrument_id: null, cells: [] }
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: PIANO } })
    await flushPromises()

    expect(wrapper.find('[data-test="fretboard-heatmap"]').exists()).toBe(false)
  })

  it('shows nothing while the layout’s tuning isn’t known', async () => {
    mapState.item.value = { ...map(), layout_instrument_id: '99999999-9999-4999-8999-999999999999' }
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.find('[data-test="fretboard-heatmap"]').exists()).toBe(false)
  })

  it('says when the map can’t be loaded, and tries again', async () => {
    mapState.item.value = null
    mapState.error.value = true
    const wrapper = mount(FretboardHeatmap, { props: { instrumentId: GUITAR } })
    await flushPromises()

    expect(wrapper.text()).toContain('Couldn’t load your fretboard.')
    await wrapper.get('[data-test="retry"]').trigger('click')
    expect(mapState.retry).toHaveBeenCalled()
  })
})
