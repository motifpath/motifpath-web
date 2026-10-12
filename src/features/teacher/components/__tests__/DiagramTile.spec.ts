import { mount, RouterLinkStub } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import DiagramTile from '@/features/teacher/components/DiagramTile.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

function mountTile(kind: 'basic' | 'custom' = 'custom') {
  return mount(DiagramTile, {
    props: {
      diagram: makeFrettedDiagram({ kind }),
      instruments: [makeFrettedInstrument()],
      name: 'A minor pentatonic — box 2',
      meta: 'Guitar · Root A',
      to: { name: 'teacher-diagram-edit', params: { id: 'd1' } },
    },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('DiagramTile', () => {
  it('shows the board, the name and one meta line, and opens the diagram', () => {
    const wrapper = mountTile()

    expect(wrapper.find('[data-test="diagram-thumbnail"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="diagram-tile-name"]').text()).toBe('A minor pentatonic — box 2')
    expect(wrapper.get('[data-test="diagram-tile-meta"]').text()).toBe('Guitar · Root A')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toEqual({ name: 'teacher-diagram-edit', params: { id: 'd1' } })
  })

  it('marks a template', () => {
    expect(mountTile('basic').get('[data-test="template-badge"]').text()).toBe('Template')
    expect(mountTile('custom').find('[data-test="template-badge"]').exists()).toBe(false)
  })
})
