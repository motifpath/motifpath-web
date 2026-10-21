import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

// The player is driven by hand: Start takes the source it was given, the music clock and the bar
// sounding are set by the test, and a take ends when the test says so.
const player = {
  state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
  currentBar: ref<number | null>(null),
  metronome: ref(false),
  clock: null as number | null,
  toggle: vi.fn(() => {
    player.state.value = 'playing'
  }),
  stop: vi.fn(() => {
    player.state.value = 'idle'
  }),
  source: null as unknown,
}
vi.mock('@/shared/composables/useProgressionPlayback', () => ({
  useProgressionPlayback: (source: () => unknown) => {
    player.source = source
    return { ...player, status: ref('ready'), tempo: ref(0), noteValue: ref('quarters'), lengthMs: ref(0), musicMs: () => player.clock }
  },
}))

import SessionGuideTone from '@/features/student/components/SessionGuideTone.vue'
import { EVERY_THIRD_AT_60, guideToneItem } from '@/features/student/testing/guideToneItems'
import { i18n } from '@/i18n'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { drillGuitar, drillVoicings } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Source = { chords: unknown[]; tempoBpm: number; noteValue: string; countInBars: number; bass: unknown }

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })
const fail = () => Promise.resolve({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
const GUITAR = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function serve(failing: string[] = []) {
  GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
    if (path === '/instruments') return ok([{ ...drillGuitar, instrument_id: drillVoicings.C.diagram.instrument_id }])
    const id = init?.params?.path?.diagram_id
    const found = Object.values(drillVoicings).find(({ diagram }) => diagram.diagram_id === id)
    if (!found || failing.includes(id ?? '')) return fail()
    return ok({ ...found.diagram, chord_voicing: found.voicing })
  })
}

async function shown(item: Item = guideToneItem(), props: { takesLeft?: number } = {}) {
  const wrapper = mount(SessionGuideTone, {
    props: { item, tuning: GUITAR, layoutName: 'Guitar', takesLeft: props.takesLeft ?? 3, takesTotal: 3 },
    global: { plugins: [i18n] },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

const tapAt = async (wrapper: Awaited<ReturnType<typeof shown>>, atMs: number, string: number, fret: number) => {
  player.clock = atMs
  await wrapper.find(`[data-test="drill-cell"][data-string="${string}"][data-fret="${fret}"]`).trigger('click')
}

/** Plays a whole take tapping `taps`, the bars moving on as their times pass, then ends it. */
async function playTake(wrapper: Awaited<ReturnType<typeof shown>>, taps: { at_ms: number; string: number; fret: number }[]) {
  await wrapper.find('[data-test="start-take"]').trigger('click')
  for (const tap of taps) {
    player.currentBar.value = Math.floor(tap.at_ms / 4000)
    await tapAt(wrapper, tap.at_ms, tap.string, tap.fret)
  }
  player.currentBar.value = null
  player.state.value = 'idle'
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  serve()
  clearEmbeddedDiagramCache()
  player.state.value = 'idle'
  player.currentBar.value = null
  player.clock = null
  player.toggle.mockClear()
  player.stop.mockClear()
  i18n.global.locale.value = 'en'
})

describe('SessionGuideTone', () => {
  it('shows the progression in its key, the window and an empty board', async () => {
    const wrapper = await shown()

    expect(wrapper.text()).toContain('Tap the 3rd of each chord')
    expect(wrapper.find('[data-test="guide-tone-progression"]').text()).toBe('ii–V–I in G')
    expect(wrapper.findAll('[data-test="guide-tone-bar"]').map((bar) => bar.text())).toEqual(['Am', 'D', 'G', 'G'])
    expect(wrapper.find('[data-test="guide-tone-meta"]').text()).toBe('Guitar · frets 0–5')
    expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(false)
  })

  it('asks the 7th when the plan does', async () => {
    const wrapper = await shown(guideToneItem({ tone: '7' }))

    expect(wrapper.text()).toContain('Tap the 7th of each chord')
  })

  it('plays a bar of count-in, then the progression once, at the plan’s tempo', async () => {
    const wrapper = await shown()
    await wrapper.find('[data-test="start-take"]').trigger('click')

    expect(player.toggle).toHaveBeenCalled()
    const source = toValue(player.source as MaybeRefOrGetter<Source>)
    expect(source.chords).toHaveLength(4)
    expect(source.countInBars).toBe(1)
    expect(source.tempoBpm).toBe(60)
    expect(source.bass).toBeNull()
  })

  it('leaves a dot where a tap landed, with no sign of right or wrong', async () => {
    const wrapper = await shown()
    await wrapper.find('[data-test="start-take"]').trigger('click')
    player.currentBar.value = 0

    await tapAt(wrapper, 100, 2, 1)

    expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="cell-mark"]').exists()).toBe(false)
  })

  it('shows a bar’s result only once the bar has passed', async () => {
    const wrapper = await shown()
    await wrapper.find('[data-test="start-take"]').trigger('click')
    player.currentBar.value = 0
    await tapAt(wrapper, 100, 2, 1)
    expect(wrapper.find('[data-test="guide-tone-meta"]').text()).toBe('Guitar · frets 0–5')

    player.currentBar.value = 1
    await flushPromises()

    expect(wrapper.find('[data-test="guide-tone-meta"]').text()).toBe('Guitar · frets 0–5 · 1 of 1 in time so far')
  })

  it('ignores taps during the count-in', async () => {
    const wrapper = await shown()
    await wrapper.find('[data-test="start-take"]').trigger('click')
    await tapAt(wrapper, -500, 2, 1)

    player.state.value = 'idle'
    await flushPromises()

    expect(wrapper.emitted('take')![0]![0]).toEqual({ tempoBpm: 60, noteValue: 'quarters', taps: [] })
  })

  it('sends the take when it ends, each tap timed from the first bar’s downbeat', async () => {
    const wrapper = await shown()

    await playTake(wrapper, EVERY_THIRD_AT_60)

    expect(wrapper.emitted('take')![0]![0]).toEqual({ tempoBpm: 60, noteValue: 'quarters', taps: EVERY_THIRD_AT_60 })
  })

  it('shows each bar hit or missed after the take, never the notes to tap', async () => {
    const wrapper = await shown()

    await playTake(wrapper, EVERY_THIRD_AT_60.filter((_, i) => i !== 1))

    const bars = wrapper.findAll('[data-test="guide-tone-result"]')
    expect(bars.map((bar) => bar.attributes('data-hit'))).toEqual(['true', 'false', 'true', 'true'])
    expect(wrapper.find('[data-test="guide-tone-results"]').text()).not.toMatch(/\b(C|F#|B)\b/)
    expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(false)
  })

  it('offers another take in the same key after a missed bar, while takes are left', async () => {
    const wrapper = await shown()
    await playTake(wrapper, EVERY_THIRD_AT_60.slice(0, 2))

    await wrapper.find('[data-test="another-take"]').trigger('click')

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="guide-tone-progression"]').text()).toBe('ii–V–I in G')
  })

  it('moves on after a right take', async () => {
    const wrapper = await shown()
    await playTake(wrapper, EVERY_THIRD_AT_60)

    expect(wrapper.find('[data-test="another-take"]').exists()).toBe(false)
    await wrapper.find('[data-test="next-item"]').trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  it('moves on after the last take, right or not', async () => {
    const wrapper = await shown(guideToneItem(), { takesLeft: 1 })
    await playTake(wrapper, [])
    await wrapper.setProps({ takesLeft: 0 })

    expect(wrapper.find('[data-test="another-take"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="next-item"]').exists()).toBe(true)
  })

  it('sends nothing for a take left in the middle', async () => {
    const wrapper = await shown()
    await wrapper.find('[data-test="start-take"]').trigger('click')
    player.currentBar.value = 0
    await tapAt(wrapper, 100, 2, 1)

    wrapper.unmount()

    expect(player.stop).toHaveBeenCalled()
    expect(wrapper.emitted('take')).toBeUndefined()
  })

  it('can only be skipped when its chords can’t be loaded', async () => {
    serve([drillVoicings.D.diagram.diagram_id])
    const wrapper = await shown()

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(false)
    await wrapper.find('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')![0]).toEqual(['unavailable'])
  })
})
