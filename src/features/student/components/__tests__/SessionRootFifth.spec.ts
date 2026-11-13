import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

// The player is driven by hand: Start takes the source it was given, and a take ends when the test says so.
const player = {
  state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
  currentBar: ref<number | null>(null),
  beat: ref<number | null>(null),
  metronome: ref(false),
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
    return { ...player, status: ref('ready'), tempo: ref(0), noteValue: ref('quarters'), lengthMs: ref(0) }
  },
}))

import SessionRootFifth from '@/features/student/components/SessionRootFifth.vue'
import { rootFifthItem } from '@/features/student/testing/chordItems'
import { drillBass } from '@/shared/testUtils/drill'
import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']
type Source = { chords: unknown[]; chordInstrument: unknown; bass: { instrument: unknown; bars: number[][] }; tempoBpm: number; countInBars: number }

/** C in the window from the third fret: its root on the A string's third fret, its fifth above on the D string's fifth and below on the low E's third. */
const C_ROOT_FIFTH: Item = {
  ...rootFifthItem(),
  item_key: `root_fifth:${drillBass.instrument_id}:C`,
  root_fifth: {
    layout_instrument_id: drillBass.instrument_id,
    chord_symbol: 'C',
    root: { string: 3, fret: 3 },
    fifth: { string: 2, fret: 5 },
    fifth_below: { string: 4, fret: 3 },
    window_start_fret: 3,
    start_tempo_bpm: 60,
  },
}

function mountItem(item: Item = C_ROOT_FIFTH, props: Record<string, unknown> = {}) {
  return mount(SessionRootFifth, { props: { item, bass: drillBass, ...props }, attachTo: document.body })
}

const source = () => toValue(player.source as MaybeRefOrGetter<Source | null>)

async function setTempo(wrapper: ReturnType<typeof mountItem>, bpm: number) {
  const slider = wrapper.get<HTMLInputElement>('[data-test="tempo-slider"]')
  slider.element.value = String(bpm)
  await slider.trigger('change')
}

/** Plays the take through: Start, then the player ends it. */
async function playTheTake(wrapper: ReturnType<typeof mountItem>) {
  await wrapper.get('[data-test="start-take"]').trigger('click')
  player.state.value = 'idle'
  await nextTick()
}

describe('SessionRootFifth', () => {
  beforeEach(() => {
    player.state.value = 'idle'
    player.beat.value = null
    player.metronome.value = false
    player.toggle.mockClear()
    player.stop.mockClear()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('marks the root, the fifth above it and the fifth below it at the places the plan gives', () => {
    const wrapper = mountItem()

    expect(wrapper.get('[data-test="item-title"]').text()).toBe('Play the root and fifth of C')
    const places = wrapper.findAll('[data-test="marked-place"]')
    expect(places.map((place) => [place.attributes('data-role'), place.attributes('data-position'), place.attributes('data-string'), place.attributes('data-fret')])).toEqual([
      ['root', undefined, '3', '3'],
      ['fifth', 'above', '2', '5'],
      ['fifth', 'below', '4', '3'],
    ])
  })

  it('leaves off a fifth below the bass’s lowest note', () => {
    const wrapper = mountItem(rootFifthItem())

    expect(wrapper.findAll('[data-test="marked-place"]').map((place) => place.attributes('data-position'))).toEqual([undefined, 'above'])
  })

  it('shows the Metronome tool’s row at the plan’s start tempo, its beat dots following the click', async () => {
    const wrapper = mountItem()

    expect(wrapper.find('[data-test="metronome-row"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('60')
    player.beat.value = 2
    await nextTick()
    expect(wrapper.findAll('[data-test="beat-dot"]').map((dot) => dot.attributes('data-lit'))).toEqual(['false', 'false', 'true', 'false'])
  })

  it('starts a take that sounds the root then the fifth above, a half note each, in the bass’s voice, after a bar of count-in, and no chord', async () => {
    const wrapper = mountItem()

    await wrapper.get('[data-test="start-take"]').trigger('click')

    expect(player.toggle).toHaveBeenCalledTimes(1)
    // C2 is MIDI 36 on the A string's third fret, G2 43 on the D string's fifth.
    expect(source()).toMatchObject({ chords: [], chordInstrument: null, bass: { instrument: drillBass, bars: [[36, 43], [36, 43], [36, 43], [36, 43]] }, tempoBpm: 60, countInBars: 1 })
  })

  it('sends the tempo it was played at with the rating, not the plan’s', async () => {
    const wrapper = mountItem()

    await setTempo(wrapper, 70)
    expect(source()?.tempoBpm).toBe(70)
    await playTheTake(wrapper)
    await wrapper.get('[data-test="rate-clean"]').trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['clean', 70]])
  })

  it('locks the tempo while the take plays, and stopping early asks for the rating', async () => {
    const wrapper = mountItem()

    await wrapper.get('[data-test="start-take"]').trigger('click')
    expect(wrapper.get('[data-test="tempo-slider"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="stop-early"]').trigger('click')

    expect(player.stop).toHaveBeenCalled()
    expect(wrapper.find('[data-test="self-rating"]').exists()).toBe(true)
  })

  it('restarting drops the take without a rating, ready again at the same tempo', async () => {
    const wrapper = mountItem()

    await setTempo(wrapper, 70)
    await wrapper.get('[data-test="start-take"]').trigger('click')
    await wrapper.get('[data-test="restart-take"]').trigger('click')

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="tempo-value"]').text()).toContain('70')
    expect(wrapper.emitted('rate')).toBeUndefined()
  })

  it('can only be skipped, as unavailable, when the bass isn’t known', async () => {
    const wrapper = mountItem(C_ROOT_FIFTH, { bass: undefined })

    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(false)
    await wrapper.get('[data-test="skip-item"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([['unavailable']])
  })

  it('names the instrument in a session mixing instruments', () => {
    expect(mountItem(C_ROOT_FIFTH, { instrumentName: 'Bass' }).get('[data-test="item-instrument"]').text()).toBe('Bass')
  })
})
