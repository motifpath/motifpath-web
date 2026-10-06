import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlayAlongInfo from '@/features/student/components/PlayAlongInfo.vue'
import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type Reason = components['schemas']['PracticeSessionItem']['reason']

const node = (name: string) => ({ names: { en: name } }) as unknown as KnowledgeNode

const diagram = makeFrettedDiagram({
  names: { en: 'A minor pentatonic, box 1' },
  classification: { skills: [node('Alternate picking')], concepts: [node('Pentatonic scale')] },
})

function mountInfo(reason: Reason = 'due', overrides: Partial<{ diagram: typeof diagram }> = {}) {
  return mount(PlayAlongInfo, { props: { reason, diagram, ...overrides } })
}

describe('PlayAlongInfo', () => {
  it('names what is being practised', () => {
    expect(mountInfo().text()).toContain('A minor pentatonic, box 1')
  })

  it('says why it was picked now', () => {
    expect(mountInfo('due').text()).toContain('time to review it')
    expect(mountInfo('stretch').text()).toContain('ready for')
  })

  it('lists the skills and concepts it works on', () => {
    const text = mountInfo().text()

    expect(text).toContain('Alternate picking')
    expect(text).toContain('Pentatonic scale')
  })

  it('leaves out skills and concepts when the diagram has none', () => {
    const bare = makeFrettedDiagram({ classification: { skills: [], concepts: [] } })
    const wrapper = mountInfo('due', { diagram: bare })

    expect(wrapper.find('[data-test="info-skills"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="info-concepts"]').exists()).toBe(false)
  })

  it('explains how a take, its rating and the tempo work', () => {
    const text = mountInfo().text()

    expect(text).toContain('count-in')
    expect(text).toContain('two clean takes')
  })

  it('says a warm-up does not count toward progress', () => {
    expect(mountInfo('warm_up').text()).toContain("doesn't count toward your progress")
  })

  it('renders in place, never as a window over the run', () => {
    const wrapper = mountInfo()

    expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="play-along-info"]').attributes('id')).toBe('play-along-info')
  })

  it('closes', async () => {
    const wrapper = mountInfo()

    await wrapper.get('[data-test="close-info"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
