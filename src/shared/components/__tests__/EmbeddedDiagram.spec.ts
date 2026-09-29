import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import FrettedDiagramView from '@/shared/components/diagram/FrettedDiagramView.vue'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import DiagramPlayer from '@/shared/components/diagram/DiagramPlayer.vue'
import {
  makeDiagramRef,
  makeFrettedDiagram,
  makeFrettedInstrument,
  makeSequencedFrettedDiagram,
} from '@/shared/testUtils/diagram'
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

  it('reports whether the diagram can be shown, for an author previewing it', async () => {
    serve(makeFrettedDiagram())
    const shown = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()
    expect(shown.emitted('status')).toEqual([['loading'], ['ready']])

    clearEmbeddedDiagramCache()
    serve(null)
    const missing = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()
    expect(missing.emitted('status')?.at(-1)).toEqual(['unavailable'])
  })

  it('passes answer cells through and reports the picked one', async () => {
    serve(makeFrettedDiagram())
    const cells = [{ optionId: 'o-1', string: 6, fret: 5 }]
    const wrapper = mount(EmbeddedDiagram, { props: { embed: single, answerCells: cells, selectedAnswerIds: ['o-1'] } })
    await flushPromises()

    const view = wrapper.getComponent(FrettedDiagramView)
    expect(view.props('answerCells')).toEqual(cells)
    expect(view.props('selectedAnswerIds')).toEqual(['o-1'])
    view.vm.$emit('selectAnswer', 'o-1')
    expect(wrapper.emitted('selectAnswer')).toEqual([['o-1']])
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

  it('passes answer choices to the view and re-emits a pick', async () => {
    serve(makeFrettedDiagram())

    const wrapper = mount(EmbeddedDiagram, {
      props: { embed: single, selectablePositionIds: ['p0', 'p5'], selectedPositionIds: ['p5'], multiple: true },
    })
    await flushPromises()

    const view = wrapper.findComponent(FrettedDiagramView)
    expect(view.props('selectablePositionIds')).toEqual(['p0', 'p5'])
    expect(view.props('selectedPositionIds')).toEqual(['p5'])
    expect(view.props('multiple')).toBe(true)

    view.vm.$emit('select', 'p0')
    expect(wrapper.emitted('select')).toEqual([['p0']])
  })

  it('draws an inert diagram: no pointer or keyboard input, hidden from screen readers, even where a marker has a note, while its region information stays usable', async () => {
    const base = makeFrettedDiagram()
    serve(makeFrettedDiagram({ positions: base.positions.map((p, i) => (i === 1 ? { ...p, note: { en: 'N', pt_BR: 'N' } } : p)) }))

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single, inert: true } })
    await flushPromises()

    expect(wrapper.getComponent(FrettedDiagramView).props('drawingInert')).toBe(true)
    expect(wrapper.get('[data-test="embedded-diagram-drawing"]').attributes()).not.toHaveProperty('inert')
  })

  it('draws a compact drawing when asked, such as an option thumbnail, and a readable one by default', async () => {
    serve(makeFrettedDiagram())

    const compact = mount(EmbeddedDiagram, { props: { embed: single, compact: true } })
    const readable = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()

    expect(compact.getComponent(FrettedDiagramView).props('compact')).toBe(true)
    expect(readable.getComponent(FrettedDiagramView).props('compact')).toBe(false)
  })

  it('is not inert by default', async () => {
    serve(makeFrettedDiagram())

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single } })
    await flushPromises()

    expect(wrapper.get('[data-test="embedded-diagram-drawing"]').attributes()).not.toHaveProperty('inert')
    expect(wrapper.getComponent(FrettedDiagramView).props('drawingInert')).toBe(false)
  })

  it('shows its unavailable slot when the diagram cannot be shown, and not while loading', async () => {
    serve(null)
    const slots = { unavailable: '<p data-test="fallback">No diagram</p>' }

    const wrapper = mount(EmbeddedDiagram, { props: { embed: single }, slots })
    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(false)
    await flushPromises()

    expect(wrapper.find('[data-test="fallback"]').exists()).toBe(true)
  })

  describe('playing', () => {
    const playable: DiagramEmbed = {
      kind: 'single',
      ref: makeDiagramRef({ playback: { direction: 'reversed', loop: true } }),
    }

    it("offers Play as the usage sets it, and lights up the markers it's playing", async () => {
      serve(makeSequencedFrettedDiagram())
      const wrapper = mount(EmbeddedDiagram, { props: { embed: playable } })
      await flushPromises()

      const player = wrapper.findComponent(DiagramPlayer)
      expect(wrapper.find('[data-test="diagram-play"]').exists()).toBe(true)
      expect(player.props('playback')).toEqual({ direction: 'reversed', loop: true })

      player.vm.$emit('active', ['p0', 'p2'])
      await flushPromises()
      expect(wrapper.findComponent(FrettedDiagramView).props('activePositionIds')).toEqual(['p0', 'p2'])
    })

    it("puts Play in the diagram's own control rail, with no player under the drawing", async () => {
      serve(makeSequencedFrettedDiagram())
      const wrapper = mount(EmbeddedDiagram, { props: { embed: playable } })
      await flushPromises()

      expect(wrapper.find('[data-test="region-rail"] [data-test="diagram-play"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-test="diagram-player"]')).toHaveLength(1)
    })

    it("makes no room for a player when the diagram's sequence has nothing to sound", async () => {
      serve(makeSequencedFrettedDiagram({ sequence: [{ position_ids: [], value: { num: 1, den: 4 }, strum: 'none' }] }))
      const wrapper = mount(EmbeddedDiagram, { props: { embed: playable } })
      await flushPromises()

      expect(wrapper.findComponent(FrettedDiagramView).props('controlsWidth')).toBe(0)
      expect(wrapper.find('[data-test="diagram-play"]').exists()).toBe(false)
    })

    it('offers no Play when the usage offers none', async () => {
      serve(makeSequencedFrettedDiagram())
      const wrapper = mount(EmbeddedDiagram, { props: { embed: single } })
      await flushPromises()
      expect(wrapper.find('[data-test="diagram-play"]').exists()).toBe(false)
    })

    it('still offers Play on an inert thumbnail, and a tap on it never reaches the card around it', async () => {
      serve(makeSequencedFrettedDiagram())
      const card = document.createElement('div')
      document.body.appendChild(card)
      const cardClick = vi.fn()
      card.addEventListener('click', cardClick)
      const wrapper = mount(EmbeddedDiagram, {
        props: { embed: playable, inert: true },
        attachTo: card,
        // Only whether the tap bubbles matters here, not the sound it starts.
        global: { stubs: { DiagramPlayer: { template: '<button data-test="diagram-play" type="button" />' } } },
      })
      await flushPromises()

      expect(wrapper.get('[data-test="embedded-diagram"]').attributes()).not.toHaveProperty('inert')
      await wrapper.get('[data-test="diagram-play"]').trigger('click')
      expect(cardClick).not.toHaveBeenCalled()

      wrapper.unmount()
      card.remove()
    })

    it('never offers Play on a stack', async () => {
      serve(makeSequencedFrettedDiagram())
      const stack: DiagramEmbed = { kind: 'stack', stack: [playable.kind === 'single' ? playable.ref : makeDiagramRef()] }
      const wrapper = mount(EmbeddedDiagram, { props: { embed: stack } })
      await flushPromises()
      expect(wrapper.findComponent(FrettedDiagramView).exists()).toBe(true)
      expect(wrapper.findComponent(DiagramPlayer).exists()).toBe(false)
    })
  })
})
