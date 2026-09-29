import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import StudyDiagram from '../StudyDiagram.vue'
import StudyPlayer from '../StudyPlayer.vue'
import DiagramStudy from '../DiagramStudy.vue'
import { makeDiagramRef, makeFrettedInstrument, makeSequencedFrettedDiagram } from '@/shared/testUtils/diagram'

vi.mock('@/shared/composables/useDiagramPlayback', () => ({ useDiagramPlayback: () => ({
  canPlay: ref(true), state: ref('idle'), activePositionIds: ref([]), tempo: ref(90),
  toggle: vi.fn(), prefetch: vi.fn(),
}) }))

describe('diagram-owned playback', () => {
  it('clears sounding markers when removing the sequence also removes its controls', async () => {
    const diagram = makeSequencedFrettedDiagram()
    const wrapper = mount(StudyDiagram, { props: {
      diagram, instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(), playback: { direction: 'as_authored', loop: false },
    } })
    wrapper.getComponent(StudyPlayer).vm.$emit('active', ['p0'])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="diagram-playing"]').exists()).toBe(true)
    await wrapper.setProps({ diagram: { ...diagram, sequence: [] } })
    expect(wrapper.find('[data-test="study-play"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="diagram-playing"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('mounts transport inside the board controls and keeps drawing input separately inert', () => {
    const wrapper = mount(StudyDiagram, { props: {
      diagram: makeSequencedFrettedDiagram(), instrument: makeFrettedInstrument(), diagramRef: makeDiagramRef(),
      playback: { direction: 'as_authored', loop: false }, drawingInert: true,
    } })
    expect(wrapper.get('[data-test="diagram-controls"]').find('[data-test="study-play"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="diagram-canvas"]').attributes('inert')).toBeDefined()
    expect(wrapper.get('[data-test="study-play"]').element.closest('[inert]')).toBeNull()
    wrapper.unmount()
  })

  it('keeps playback, tempo and region actions independent of option selection', async () => {
    const wrapper = mount(DiagramStudy)
    await wrapper.get('[data-test="exercise-preview-type"]').setValue('choice')
    const cards = wrapper.findAll('[data-test="study-choice"]')
    expect(cards).toHaveLength(2)
    const first = cards[0]!
    const selected = () => cards.map(card => card.get('[data-test="choose-diagram"]').attributes('aria-checked'))
    await first.get('[data-test="study-play"]').trigger('click')
    await first.get('[data-test="tempo-toggle"]').trigger('click')
    await first.get('input[type="range"]').setValue('120')
    await first.get('[data-test="region-info"]').trigger('click')
    expect(selected()).toEqual(['false', 'false'])
    await first.get('[data-test="choose-diagram"]').trigger('click')
    expect(selected()).toEqual(['true', 'false'])
    await cards[1]!.get('[data-test="board-scroll"]').trigger('click')
    expect(selected()).toEqual(['false', 'true'])
    wrapper.unmount()
  })
})
