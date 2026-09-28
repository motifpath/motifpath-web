import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import OverlayDiagramsModal from '@/features/teacher/components/OverlayDiagramsModal.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const flush = () => new Promise((r) => setTimeout(r, 0))

const pentatonic = makeFrettedDiagram({ diagram_id: 'd-penta', names: { en: 'A minor pentatonic' }, color: '#22C55E' })
const major = makeFrettedDiagram({ diagram_id: 'd-major', names: { en: 'C major scale' } })
const merged = makeFrettedDiagram({ diagram_id: '', names: { en: 'Merged preview' } })

interface Props {
  overlays: Diagram[]
  preview: Diagram | null
  regionPerLayer: boolean
  canMerge: boolean
  excludeIds: string[]
}

function mountModal(props: Partial<Props> = {}) {
  return mount(OverlayDiagramsModal, {
    props: {
      instrument: makeFrettedInstrument(),
      excludeIds: [],
      overlays: [pentatonic],
      preview: merged,
      regionPerLayer: true,
      canMerge: true,
      ...props,
    },
  })
}

describe('OverlayDiagramsModal', () => {
  beforeEach(() => {
    GET.mockReset()
    // The picker also loads instruments (for its thumbnails) and the library's creators.
    GET.mockImplementation((path: string) => {
      const data =
        path === '/diagrams'
          ? { items: [pentatonic, major], total: 2, limit: 20, offset: 0 }
          : path === '/instruments'
            ? [makeFrettedInstrument()]
            : []
      return Promise.resolve({ data, error: undefined, response: { status: 200 } })
    })
  })

  it('starts on the list of diagrams to overlay when nothing is overlaid yet, and adds the one picked', async () => {
    const wrapper = mountModal({ overlays: [], preview: null })
    await flush()

    await wrapper.findAll('[data-test="diagram-option"]')[1]!.trigger('click')

    expect(wrapper.emitted('add')).toEqual([[major]])
    expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(false)
  })

  it('shows the full-size preview of the merge, and lists what is overlaid', () => {
    const wrapper = mountModal()

    expect(wrapper.find('[data-test="diagram-option"]').exists()).toBe(false)
    expect(wrapper.getComponent(FrettedDiagramView).props('diagram')).toEqual(merged)
    expect(wrapper.findAll('[data-test="overlay-item"]').map((item) => item.text())).toEqual(['A minor pentatonic'])
  })

  it('removes an overlay', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="remove-overlay"]').trigger('click')

    expect(wrapper.emitted('remove')).toEqual([['d-penta']])
  })

  it('goes back to the list to overlay another diagram, leaving out those already overlaid', async () => {
    const wrapper = mountModal({ excludeIds: ['d-base', 'd-penta'] })

    await wrapper.get('[data-test="add-another-overlay"]').trigger('click')
    await flush()

    expect(wrapper.findAll('[data-test="diagram-option-name"]').map((n) => n.text())).toEqual(['C major scale'])
    await wrapper.get('[data-test="back-to-preview"]').trigger('click')
    expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(true)
  })

  it('offers a region per diagram, following the chosen option', async () => {
    const wrapper = mountModal({ regionPerLayer: true })
    const option = wrapper.get<HTMLInputElement>('[data-test="merge-region-per-layer"]')

    expect(option.element.checked).toBe(true)
    await option.setValue(false)

    expect(wrapper.emitted('update:regionPerLayer')).toEqual([[false]])
  })

  it('merges', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="merge-overlays"]').trigger('click')

    expect(wrapper.emitted('merge')).toHaveLength(1)
  })

  it("can't merge while a position of this diagram has no interval, and says why", () => {
    const wrapper = mountModal({ canMerge: false })

    expect(wrapper.get('[data-test="merge-overlays"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-test="merge-needs-root"]').exists()).toBe(true)
  })

  it('discards from its Discard button or its close button', async () => {
    const wrapper = mountModal()

    await wrapper.get('[data-test="discard-overlays"]').trigger('click')
    await wrapper.get('[data-test="close-modal"]').trigger('click')

    expect(wrapper.emitted('discard')).toHaveLength(2)
    expect(wrapper.emitted('merge')).toBeUndefined()
  })
})
