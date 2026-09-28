import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { DiagramEmbed } from '@/shared/utils/diagramEmbed'
import type { components } from '@/api/generated/core-domain'

type Diagram = components['schemas']['Diagram']

const ok = <T>(data: T) => Promise.resolve({ data, error: undefined, response: { status: 200 } })

function serve(diagram: Diagram | null) {
  GET.mockImplementation((path: string) => {
    if (path === '/instruments') return ok([makeFrettedInstrument()])
    return diagram ? ok(diagram) : Promise.resolve({ data: undefined, error: {}, response: { status: 404 } })
  })
}

const single: DiagramEmbed = { kind: 'single', ref: makeDiagramRef() }

beforeEach(() => {
  GET.mockReset()
  clearEmbeddedDiagramCache()
})

describe('EmbeddedDiagram', () => {
  it('holds the space with a loading placeholder until the diagram arrives', () => {
    // Only the diagram is held back: the instruments request is shared across mounts.
    GET.mockImplementation((path: string) =>
      path === '/instruments' ? ok([makeFrettedInstrument()]) : new Promise(() => {}),
    )

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single, caption: 'Position 1' } })

    expect(wrapper.find('[data-test="embedded-diagram-loading"]').exists()).toBe(true)
    expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(false)
    expect(wrapper.find('figcaption').exists()).toBe(false)
  })

  it('draws the diagram with its caption once loaded', async () => {
    serve(makeFrettedDiagram())

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single, caption: 'Position 1' } })
    await flushPromises()

    const view = wrapper.findComponent(FrettedDiagramView)
    expect(view.exists()).toBe(true)
    expect(view.props('diagramRef')).toEqual(single.kind === 'single' ? single.ref : null)
    expect(wrapper.find('[data-test="embedded-diagram-loading"]').exists()).toBe(false)
    expect(wrapper.get('figcaption').text()).toBe('Position 1')
  })

  it("passes on the author's label choice", async () => {
    serve(makeFrettedDiagram({ label_display: 'hidden' }))

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()

    expect(wrapper.findComponent(FrettedDiagramView).props('labelMode')).toBe('hidden')
  })

  it('has no caption when none is given', async () => {
    serve(makeFrettedDiagram())

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()

    expect(wrapper.find('figcaption').exists()).toBe(false)
  })

  it('shows nothing at all, caption included, when the diagram cannot be shown', async () => {
    serve(null)

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single, caption: 'Position 1' } })
    await flushPromises()

    expect(wrapper.find('figure').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
