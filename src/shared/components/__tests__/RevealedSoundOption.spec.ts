import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { makeDiagramRef, makeFrettedDiagram } from '@/shared/testUtils/diagram'

const gMajor = makeFrettedDiagram({ diagram_id: 'g-major', names: { en: 'G major' } })

vi.mock('@/shared/composables/useEmbeddedDiagram', () => ({
  useEmbeddedDiagram: () => ({ diagram: ref(gMajor) }),
}))

import RevealedSoundOption from '@/shared/components/RevealedSoundOption.vue'

const SOUND = makeDiagramRef({ diagram_id: 'g-major', playback: { playback_id: 'strum', direction: 'as_authored', loop: false } })

const stubs = { EmbeddedDiagram: { name: 'EmbeddedDiagram', props: ['embed'], template: '<div data-test="embedded-diagram" />' } }

const mountRevealed = (props: { role: 'yours' | 'right' | null; mark?: 'right' | 'wrong'; label?: string }) =>
  mount(RevealedSoundOption, { props: { label: 'Sound 2', sound: SOUND, ...props }, global: { stubs } })

describe('RevealedSoundOption', () => {
  it('shows the student’s wrong answer with its diagram, named and drawn', () => {
    const wrapper = mountRevealed({ role: 'yours', mark: 'wrong' })

    expect(wrapper.get('[data-test="revealed-sound-head"]').text()).toBe('Sound 2 · your answer')
    expect(wrapper.get('[data-test="revealed-sound-name"]').text()).toBe('G major')
    expect(wrapper.getComponent({ name: 'EmbeddedDiagram' }).props('embed')).toEqual({ kind: 'single', ref: SOUND })
    expect(wrapper.attributes('data-mark')).toBe('wrong')
  })

  it('shows the right answer the student missed with its diagram', () => {
    const wrapper = mountRevealed({ label: 'Sound 3', role: 'right', mark: 'right' })

    expect(wrapper.get('[data-test="revealed-sound-head"]').text()).toBe('Sound 3 · right answer')
    expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(true)
    expect(wrapper.attributes('data-mark')).toBe('right')
  })

  it('folds any other sound to one line, which opens to its diagram', async () => {
    const wrapper = mountRevealed({ label: 'Sound 1', role: null })

    const line = wrapper.get('[data-test="revealed-sound-toggle"]')
    expect(line.text()).toBe('Sound 1 · G major')
    expect(line.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(false)

    await line.trigger('click')

    expect(line.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('[data-test="embedded-diagram"]').exists()).toBe(true)
  })
})
