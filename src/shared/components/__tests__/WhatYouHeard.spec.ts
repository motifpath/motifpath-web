import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'

const sound = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }))

vi.mock('@/shared/composables/useDiagramSound', () => ({
  useDiagramSound: () => sound.current,
}))

import WhatYouHeard from '@/shared/components/WhatYouHeard.vue'
import { makeDiagramRef, makeFrettedDiagram, makePlayback } from '@/shared/testUtils/diagram'

const arpeggio = makePlayback({ playback_id: 'arpeggio', names: { en: 'Arpeggio' }, tempo_bpm: 60 })
const aMinor = makeFrettedDiagram({ diagram_id: 'a-minor', names: { en: 'A minor' }, playbacks: [arpeggio] })

const SOUND = makeDiagramRef({
  diagram_id: 'a-minor',
  playback: { playback_id: 'arpeggio', direction: 'as_authored', loop: false },
})

function fakeSound() {
  return {
    state: ref<'idle' | 'loading' | 'playing' | 'error'>('idle'),
    diagram: ref<typeof aMinor | null>(aMinor),
    canPlay: computed(() => true),
    activePositionIds: ref<string[]>([]),
    toggle: vi.fn(),
  }
}

let fake: ReturnType<typeof fakeSound>

/** Stands in for the board, showing which markers it is asked to light. */
const EmbeddedDiagram = defineComponent({
  name: 'EmbeddedDiagram',
  props: { embed: { type: Object, required: true }, activePositionIds: { type: Array, default: undefined } },
  setup: () => () => h('div', { 'data-test': 'embedded-diagram' }),
})

beforeEach(() => {
  fake = fakeSound()
  sound.current = fake
})

const mountHeard = () => mount(WhatYouHeard, { props: { sound: SOUND }, global: { stubs: { EmbeddedDiagram } } })

describe('WhatYouHeard', () => {
  it('names and draws the diagram that made the sound', () => {
    const wrapper = mountHeard()

    expect(wrapper.get('[data-test="what-you-heard-name"]').text()).toBe('What you heard: A minor')
    expect(wrapper.getComponent(EmbeddedDiagram).props('embed')).toEqual({ kind: 'single', ref: SOUND })
  })

  it('plays it again when Play again is tapped, lighting each position while it sounds', async () => {
    const wrapper = mountHeard()
    await wrapper.get('[data-test="play-again"]').trigger('click')
    expect(fake.toggle).toHaveBeenCalledTimes(1)

    fake.activePositionIds.value = ['p0', 'p2']
    await flushPromises()
    expect(wrapper.getComponent(EmbeddedDiagram).props('activePositionIds')).toEqual(['p0', 'p2'])
  })

  it('plays only the playback the exercise used, offering no other', () => {
    const wrapper = mountHeard()
    expect(wrapper.findAll('[data-test="play-again"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Arpeggio')
    expect(wrapper.find('select').exists()).toBe(false)
  })

  it('offers Stop while it plays', async () => {
    const wrapper = mountHeard()
    fake.state.value = 'playing'
    await flushPromises()
    expect(wrapper.get('[data-test="play-again"]').attributes('aria-label')).toBe('Stop')
  })

  it('shows nothing while the diagram is not there', () => {
    fake.diagram.value = null
    const wrapper = mountHeard()
    expect(wrapper.find('[data-test="what-you-heard"]').exists()).toBe(false)
  })
})
