import { mount } from '@vue/test-utils'
import { ref, nextTick, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'
import StudyPlayer from '../StudyPlayer.vue'

const playback = vi.hoisted(() => ({ toggle: vi.fn(), prefetch: vi.fn() }))
const state = ref('idle')
const tempo = ref(90)
const activePositionIds = ref<string[]>([])
const canPlay = ref(true)
vi.mock('@/shared/composables/useDiagramPlayback', () => ({
  useDiagramPlayback: () => ({ ...playback, state, tempo, activePositionIds, canPlay }),
}))
const mountPlayer = () => mount(StudyPlayer, { props: {
  diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(),
  playback: { direction: 'as_authored', loop: false },
} })
beforeEach(() => { state.value = 'idle'; tempo.value = 90; canPlay.value = true; activePositionIds.value = []; vi.clearAllMocks() })

describe('compact study player', () => {
  it('offers a labeled transport and opens tempo settings only on demand', async () => {
    const wrapper = mountPlayer()
    expect(wrapper.get('[data-test="study-play"]').text()).toContain('Play')
    expect(wrapper.find('[data-test="tempo-panel"]').exists()).toBe(false)
    await wrapper.get('[data-test="tempo-toggle"]').trigger('click')
    expect(wrapper.get('[data-test="tempo-toggle"]').attributes('aria-expanded')).toBe('true')
    await wrapper.get('input[type="range"]').setValue('120')
    expect(tempo.value).toBe(120)
    await wrapper.get('input[type="number"]').setValue('999')
    expect(tempo.value).toBe(120)
    await wrapper.get('input[type="number"]').setValue('72')
    expect(tempo.value).toBe(72)
    await wrapper.get('[data-test="tempo-panel"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[data-test="tempo-panel"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('delegates transport and sounding identities to the production engine', async () => {
    const wrapper = mountPlayer()
    await wrapper.get('[data-test="study-play"]').trigger('click')
    expect(playback.toggle).toHaveBeenCalledOnce()
    state.value = 'playing'; activePositionIds.value = ['p0', 'p1']
    await nextTick()
    expect(wrapper.get('[data-test="study-play"]').text()).toContain('Stop')
    expect(wrapper.emitted('active')?.at(-1)).toEqual([['p0', 'p1']])
    wrapper.unmount()
  })
  it('allows cancelling loading and retrying a failure without hiding the controls', async () => {
    const wrapper = mountPlayer()
    state.value = 'loading'; await nextTick()
    expect(wrapper.get('[data-test="study-play"]').attributes('aria-busy')).toBe('true')
    await wrapper.get('[data-test="study-play"]').trigger('click')
    expect(playback.toggle).toHaveBeenCalledOnce()
    state.value = 'error'; await nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('load')
    expect(wrapper.get('[data-test="study-play"]').text()).toContain('Retry')
    wrapper.unmount()
  })
  it('offers no transport when the engine considers the diagram ineligible', () => {
    canPlay.value = false
    const wrapper = mountPlayer()
    expect(wrapper.find('[data-test="study-player"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('closes tempo settings on an outside press and gives separate players distinct label targets', async () => {
    const host = mount({ render: () => h('div', [0, 1].map(() => h(StudyPlayer, {
      diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), playback: { direction: 'as_authored', loop: false },
    }))) })
    const [first, second] = host.findAllComponents(StudyPlayer)
    if (!first || !second) throw new Error('Both players must render')
    await first.get('[data-test="tempo-toggle"]').trigger('click')
    await second.get('[data-test="tempo-toggle"]').trigger('click')
    expect(first.get('input[type="number"]').attributes('id')).not.toBe(second.get('input[type="number"]').attributes('id'))
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(first.find('[data-test="tempo-panel"]').exists()).toBe(false)
    host.unmount()
  })
})
