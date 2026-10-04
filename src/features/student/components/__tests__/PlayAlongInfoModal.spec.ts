import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlayAlongInfoModal from '@/features/student/components/PlayAlongInfoModal.vue'
import type { components } from '@/api/generated/core-domain'
import { makeFrettedDiagram } from '@/shared/testUtils/diagram'

type KnowledgeNode = components['schemas']['KnowledgeNode']
type Reason = components['schemas']['PracticeSessionItem']['reason']

const node = (name: string) => ({ names: { en: name } }) as unknown as KnowledgeNode

const diagram = makeFrettedDiagram({
  names: { en: 'A minor pentatonic, box 1' },
  classification: { skills: [node('Alternate picking')], concepts: [node('Pentatonic scale')] },
})

function mountModal(reason: Reason = 'due', overrides: Partial<{ diagram: typeof diagram }> = {}) {
  return mount(PlayAlongInfoModal, {
    props: { open: true, reason, diagram, ...overrides },
    global: { stubs: { teleport: true } },
  })
}

describe('PlayAlongInfoModal', () => {
  it('names what is being practised', () => {
    expect(mountModal().text()).toContain('A minor pentatonic, box 1')
  })

  it('says why it was picked now', () => {
    expect(mountModal('due').text()).toContain('time to review it')
    expect(mountModal('stretch').text()).toContain('ready for')
  })

  it('lists the skills and concepts it works on', () => {
    const text = mountModal().text()

    expect(text).toContain('Alternate picking')
    expect(text).toContain('Pentatonic scale')
  })

  it('leaves out skills and concepts when the diagram has none', () => {
    const bare = makeFrettedDiagram({ classification: { skills: [], concepts: [] } })
    const wrapper = mountModal('due', { diagram: bare })

    expect(wrapper.find('[data-test="info-skills"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="info-concepts"]').exists()).toBe(false)
  })

  it('explains how a take, its rating and the tempo work', () => {
    const text = mountModal().text()

    expect(text).toContain('count-in')
    expect(text).toContain('two clean takes')
  })

  it('says a warm-up does not count toward progress', () => {
    expect(mountModal('warm_up').text()).toContain("doesn't count toward your progress")
  })

  it('closes', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
