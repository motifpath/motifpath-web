import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { PlaybackSource, PlaybackState } from '@/shared/composables/useDiagramPlayback'

type Item = components['schemas']['PracticeSessionItem']

const DIAGRAM_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const diagram = {
  diagram_id: DIAGRAM_ID,
  instrument_id: 'guitar',
  time_signature: { beats: 4, beat_value: 4 },
  tempo_bpm: 100,
  sequence: [{ position_ids: ['p1'], value: { num: 1, den: 4 }, strum: 'none' }],
  positions: [],
  regions: [],
}
const instrument = { instrument_id: 'guitar', family: 'fretted', tuning: [64, 59, 55, 50, 45, 40] }

const embedded = {
  status: ref<'loading' | 'ready' | 'unavailable'>('ready'),
  diagram: ref<unknown>(diagram),
  instrument: ref<unknown>(instrument),
  diagramRef: ref<unknown>({ diagram_id: DIAGRAM_ID, layers: { intervals: true } }),
  labelMode: ref('interval'),
}
const embeddedWith = vi.fn()
vi.mock('@/shared/composables/useEmbeddedDiagram', () => ({
  useEmbeddedDiagram: (source: unknown) => {
    embeddedWith(toValue(source as MaybeRefOrGetter<unknown>))
    return embedded
  },
}))

const playback = {
  state: ref<PlaybackState>('idle'),
  activePositionIds: ref<string[]>([]),
  tempo: ref(0),
  toggle: vi.fn(),
  stop: vi.fn(),
}
let playbackSource: () => PlaybackSource
vi.mock('@/shared/composables/useDiagramPlayback', () => ({
  useDiagramPlayback: (source: () => PlaybackSource) => {
    playbackSource = source
    return { ...playback, canPlay: ref(true), prefetch: vi.fn() }
  },
}))

import PlayAlongTake from '@/features/student/components/PlayAlongTake.vue'

function item(reason: Item['reason'] = 'due', best: number | null = 70): Item {
  return {
    item_key: `play_along:${DIAGRAM_ID}`,
    kind: 'play_along',
    reason,
    node_id: null,
    level: 'learning',
    estimated_seconds: 60,
    play_along: { diagram_id: DIAGRAM_ID, start_tempo_bpm: 70, target_tempo_bpm: 100, best_clean_tempo_bpm: best },
  }
}

function mountTake(props: Partial<{ item: Item; tempo: number; takesLeft: number }> = {}) {
  return mount(PlayAlongTake, {
    props: { item: item(), tempo: 70, takesLeft: 4, ...props },
    global: { stubs: { FrettedDiagramView: true } },
  })
}

async function playTakeToTheEnd() {
  playback.state.value = 'loading'
  await nextTick()
  playback.state.value = 'playing'
  await nextTick()
  playback.state.value = 'idle'
  await nextTick()
}

describe('PlayAlongTake', () => {
  beforeEach(() => {
    vi.useRealTimers()
    embedded.status.value = 'ready'
    playback.state.value = 'idle'
    playback.toggle.mockReset()
    playback.stop.mockReset()
  })

  it('loads the item’s diagram', () => {
    mountTake()

    expect(embeddedWith).toHaveBeenCalledWith({
      kind: 'single',
      ref: { diagram_id: DIAGRAM_ID, layers: { intervals: true } },
    })
  })

  it('shows the take’s tempo, the goal, the best clean tempo and the takes left', () => {
    const text = mountTake().text()

    expect(text).toContain('70 BPM')
    expect(text).toContain('Goal 100 BPM · best clean 70')
    expect(text).toContain('4 takes left')
  })

  it('plays the diagram once, after a bar of count-in, at the take’s tempo', () => {
    mountTake({ tempo: 85 })

    const source = playbackSource()
    expect(source.diagram.sequence).toHaveLength(5)
    expect(source.diagram.sequence.slice(0, 4).every((step) => step.position_ids.length === 0)).toBe(true)
    expect(source.playback).toEqual({ tempo_bpm: 85, voice_id: null, direction: 'as_authored', loop: false })
  })

  it('starts the take from the Start button', async () => {
    const wrapper = mountTake()

    await wrapper.get('[data-test="start-take"]').trigger('click')

    expect(playback.toggle).toHaveBeenCalledOnce()
  })

  it('counts the bar in, beat by beat, once the sound starts', async () => {
    vi.useFakeTimers()
    const wrapper = mountTake({ tempo: 60 })
    await wrapper.get('[data-test="start-take"]').trigger('click')
    playback.state.value = 'loading'
    await nextTick()
    playback.state.value = 'playing'
    await nextTick()

    expect(wrapper.get('[data-test="count-in"]').text()).toBe('4')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.get('[data-test="count-in"]').text()).toBe('3')
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(wrapper.find('[data-test="count-in"]').exists()).toBe(false)
  })

  it('asks for a rating when the take ends by itself, and emits it', async () => {
    const wrapper = mountTake()
    await wrapper.get('[data-test="start-take"]').trigger('click')
    await playTakeToTheEnd()

    expect(wrapper.text()).toContain('How was that take at 70 BPM?')
    await wrapper.get('[data-test="rate-clean"]').trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['clean']])
    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
  })

  it('stops a take early and asks for its rating', async () => {
    const wrapper = mountTake()
    await wrapper.get('[data-test="start-take"]').trigger('click')
    playback.state.value = 'loading'
    await nextTick()
    playback.state.value = 'playing'
    await nextTick()

    await wrapper.get('[data-test="stop-early"]').trigger('click')

    expect(playback.stop).toHaveBeenCalled()
    expect(wrapper.find('[data-test="rate-struggled"]').exists()).toBe(true)
  })

  it('says when the next take goes up or down the ladder', async () => {
    const wrapper = mountTake({ tempo: 70 })
    await wrapper.get('[data-test="start-take"]').trigger('click')
    await playTakeToTheEnd()
    await wrapper.get('[data-test="rate-clean"]').trigger('click')
    await wrapper.setProps({ tempo: 75 })

    expect(wrapper.text()).toContain('Clean twice: up to 75 BPM.')

    await wrapper.get('[data-test="start-take"]').trigger('click')
    await playTakeToTheEnd()
    await wrapper.get('[data-test="rate-struggled"]').trigger('click')
    await wrapper.setProps({ tempo: 70 })
    expect(wrapper.text()).toContain("Let's settle it at 70 BPM.")
  })

  it('offers the take again when the sound fails to load', async () => {
    const wrapper = mountTake()
    await wrapper.get('[data-test="start-take"]').trigger('click')
    playback.state.value = 'loading'
    await nextTick()
    playback.state.value = 'error'
    await nextTick()

    expect(wrapper.text()).toContain("The sound didn't load.")
    expect(wrapper.find('[data-test="start-take"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="rate-clean"]').exists()).toBe(false)
  })

  it('tells a warm-up apart, without the goal', () => {
    const text = mountTake({ item: item('warm_up') }).text()

    expect(text).toContain("Warm-up: play it relaxed. It doesn't count toward your progress.")
    expect(text).not.toContain('Goal')
  })

  it('shows "none yet" before the first clean take', () => {
    expect(mountTake({ item: item('new', null) }).text()).toContain('best clean none yet')
  })

  it('offers to skip an item whose diagram can’t be played', async () => {
    embedded.status.value = 'unavailable'
    const wrapper = mountTake()
    await flushPromises()

    expect(wrapper.text()).toContain("This diagram can't be played here.")
    await wrapper.get('[data-test="skip-item"]').trigger('click')
    expect(wrapper.emitted('skip')).toHaveLength(1)
  })

  it('offers 5 BPM slower or faster for the next take', async () => {
    const wrapper = mountTake({ tempo: 70 })

    await wrapper.get('[data-test="tempo-up"]').trigger('click')
    await wrapper.get('[data-test="tempo-down"]').trigger('click')

    expect(wrapper.emitted('tempo')).toEqual([[75], [65]])
  })

  it('says nothing about the ladder when the student changed the tempo', async () => {
    const wrapper = mountTake({ tempo: 70 })
    await wrapper.get('[data-test="tempo-up"]').trigger('click')
    await wrapper.setProps({ tempo: 75 })

    expect(wrapper.text()).not.toContain('Clean twice')
  })

  it('offers no tempo change while a take plays', async () => {
    const wrapper = mountTake()
    await wrapper.get('[data-test="start-take"]').trigger('click')

    expect(wrapper.find('[data-test="tempo-up"]').exists()).toBe(false)
  })
})

