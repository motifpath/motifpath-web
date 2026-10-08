import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import PromptRenderer from '@/shared/components/PromptRenderer.vue'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import SongChartCard from '@/shared/components/songChart/SongChartCard.vue'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']

function doc(content: PromptDocument['content']): PromptDocument {
  return { type: 'doc', content }
}

describe('PromptRenderer', () => {
  it('renders a single unformatted paragraph', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          { type: 'paragraph', content: [{ type: 'text', text: 'What note is this?' }] },
        ]),
      },
    })

    expect(wrapper.text()).toContain('What note is this?')
  })

  it('renders a heading at its level', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Circle of fifths' }],
          },
        ]),
      },
    })

    const heading = wrapper.get('h2')
    expect(heading.text()).toBe('Circle of fifths')
  })

  it('clamps an out-of-range heading level so its tag and size stay consistent', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'heading',
            attrs: { level: 4 },
            content: [{ type: 'text', text: 'Circle of fifths' }],
          },
        ]),
      },
    })

    const heading = wrapper.get('h3')
    expect(heading.classes()).toContain('text-base')
    expect(heading.classes()).not.toContain('text-xl')
  })

  it('renders an unrecognized node type as its children rather than dropping them', () => {
    // A node type outside the current PromptNode union, e.g. from schema
    // drift between backend and frontend deploys — parsed from JSON like
    // real wire data would be, rather than asserted past the type system.
    const document: PromptDocument = JSON.parse(
      '{"type":"doc","content":[{"type":"futureNodeType","content":[{"type":"text","text":"still visible"}]}]}',
    )
    const wrapper = mount(PromptRenderer, { props: { document } })

    expect(wrapper.text()).toContain('still visible')
  })

  it('applies bold, italic, strike, and highlight marks', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
              { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
              { type: 'text', text: 'strike', marks: [{ type: 'strike' }] },
              { type: 'text', text: 'highlight', marks: [{ type: 'highlight' }] },
            ],
          },
        ]),
      },
    })

    expect(wrapper.find('.font-bold').text()).toBe('bold')
    expect(wrapper.find('.italic').text()).toBe('italic')
    expect(wrapper.find('.line-through').text()).toBe('strike')
    expect(wrapper.find('.bg-accent-muted').text()).toBe('highlight')
  })

  it('applies a textStyle mark\'s font color and background color as inline style', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Circle of fifths',
                marks: [{ type: 'textStyle', attrs: { color: '#6d28e0', backgroundColor: '#f3ecff' } }],
              },
            ],
          },
        ]),
      },
    })

    const span = wrapper.get('span')
    expect(span.attributes('style')).toContain('color: rgb(109, 40, 224)')
    expect(span.attributes('style')).toContain('background-color: rgb(243, 236, 255)')
  })

  it('renders a link mark as an anchor with its href', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'circle of fifths',
                marks: [{ type: 'link', attrs: { href: 'https://example.com/circle-of-fifths' } }],
              },
            ],
          },
        ]),
      },
    })

    const link = wrapper.get('a')
    expect(link.text()).toBe('circle of fifths')
    expect(link.attributes('href')).toBe('https://example.com/circle-of-fifths')
  })

  it('renders a link mark with an unsafe href as plain text, not an anchor', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'click me',
                marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
              },
            ],
          },
        ]),
      },
    })

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.text()).toContain('click me')
  })

  it('renders bullet and ordered lists with their items', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Major keys' }] }],
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Step one' }] }],
              },
            ],
          },
        ]),
      },
    })

    expect(wrapper.get('ul li').text()).toBe('Major keys')
    expect(wrapper.get('ol li').text()).toBe('Step one')
  })

  it('renders a table with its header and cell text', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  { type: 'tableHeader', content: [{ type: 'text', text: 'Key' }] },
                  { type: 'tableCell', content: [{ type: 'text', text: 'C major' }] },
                ],
              },
            ],
          },
        ]),
      },
    })

    expect(wrapper.get('table th').text()).toBe('Key')
    expect(wrapper.get('table td').text()).toBe('C major')
  })

  it("applies a table cell's background color and border color as inline style", () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: { backgroundColor: '#f3ecff', borderColor: 'transparent' },
                    content: [{ type: 'text', text: 'C major' }],
                  },
                ],
              },
            ],
          },
        ]),
      },
    })

    const style = wrapper.get('table td').attributes('style')
    expect(style).toContain('background-color: rgb(243, 236, 255)')
    expect(style).toContain('border-color: transparent')
  })

  it('renders an image with its src and alt', () => {
    const wrapper = mount(PromptRenderer, {
      props: {
        document: doc([
          {
            type: 'image',
            attrs: { src: 'https://cdn.example.com/circle-of-fifths.png', alt: 'Circle of fifths diagram' },
          },
        ]),
      },
    })

    const img = wrapper.get('img')
    expect(img.attributes('src')).toBe('https://cdn.example.com/circle-of-fifths.png')
    expect(img.attributes('alt')).toBe('Circle of fifths diagram')
  })

  describe('an embedded song chart', () => {
    // The card loads its chart itself; its own spec covers that.
    const stubs = { SongChartCard: true }

    it('shows the card of the chart its node names, between the text around it', () => {
      const wrapper = mount(PromptRenderer, {
        props: {
          document: doc([
            { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
            { type: 'songChart', attrs: { songChartId: 'chart-asa-branca' } },
            { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
          ]),
        },
        global: { stubs },
      })

      expect(wrapper.getComponent(SongChartCard).props('songChartId')).toBe('chart-asa-branca')
      const html = wrapper.html()
      expect(html.indexOf('Before')).toBeLessThan(html.indexOf('song-chart-card-stub'))
      expect(html.indexOf('song-chart-card-stub')).toBeLessThan(html.indexOf('After'))
    })

    it('shows nothing for a song chart node without a chart', () => {
      const wrapper = mount(PromptRenderer, { props: { document: doc([{ type: 'songChart', attrs: {} }]) }, global: { stubs } })

      expect(wrapper.findComponent(SongChartCard).exists()).toBe(false)
    })
  })

  describe('an inline diagram', () => {
    // The embedded diagram loads itself; its own spec covers that.
    const stubs = { EmbeddedDiagram: true }

    it('shows the diagram its node refers to, between the text around it', () => {
      const wrapper = mount(PromptRenderer, {
        props: {
          document: doc([
            { type: 'paragraph', content: [{ type: 'text', text: 'Before' }] },
            { type: 'diagram', attrs: { diagramRef: makeDiagramRef() } },
            { type: 'paragraph', content: [{ type: 'text', text: 'After' }] },
          ]),
        },
        global: { stubs },
      })

      const diagram = wrapper.getComponent(EmbeddedDiagram)
      expect(diagram.props('embed')).toEqual({ kind: 'single', ref: makeDiagramRef() })
      expect(diagram.props('caption')).toBeUndefined()
      const html = wrapper.html()
      expect(html.indexOf('Before')).toBeLessThan(html.indexOf('embedded-diagram-stub'))
      expect(html.indexOf('embedded-diagram-stub')).toBeLessThan(html.indexOf('After'))
    })

    it('shows a stack of diagrams', () => {
      const stack = [makeDiagramRef(), makeDiagramRef({ diagram_id: 'diagram-2' })]
      const wrapper = mount(PromptRenderer, {
        props: { document: doc([{ type: 'diagram', attrs: { diagramStackRef: { stack } } }]) },
        global: { stubs },
      })

      expect(wrapper.getComponent(EmbeddedDiagram).props('embed')).toEqual({ kind: 'stack', stack })
    })

    it('ignores the snake_case keys a cue uses, since a node carries its diagram in camelCase attrs', () => {
      const wrapper = mount(PromptRenderer, {
        props: { document: doc([{ type: 'diagram', attrs: { diagram_ref: makeDiagramRef() } }]) },
        global: { stubs },
      })

      expect(wrapper.findComponent(EmbeddedDiagram).exists()).toBe(false)
    })

    it('shows nothing for a diagram node without a usable reference', () => {
      const wrapper = mount(PromptRenderer, {
        props: { document: doc([{ type: 'diagram', attrs: { diagramRef: { diagram_id: 'd-1' } } }, { type: 'diagram' }]) },
        global: { stubs },
      })

      expect(wrapper.findComponent(EmbeddedDiagram).exists()).toBe(false)
      expect(wrapper.text()).toBe('')
    })

    it('shows the diagram of a changed document, not the one it replaced', async () => {
      const box1 = makeFrettedDiagram()
      const box2 = makeFrettedDiagram({ diagram_id: 'diagram-2', positions: box1.positions.slice(0, 2) })
      GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
        const data = path === '/instruments' ? [makeFrettedInstrument()] : [box1, box2].find(
          (d) => d.diagram_id === init?.params?.path?.diagram_id,
        )
        return Promise.resolve({ data, error: undefined, response: { status: 200 } })
      })
      // Mounted for real, so what the student sees is the loaded diagram itself.
      const wrapper = mount(PromptRenderer, {
        props: { document: doc([{ type: 'diagram', attrs: { diagramRef: makeDiagramRef() } }]) },
      })
      await flushPromises()
      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(box1.positions.length)

      const next = makeDiagramRef({ diagram_id: 'diagram-2' })
      await wrapper.setProps({ document: doc([{ type: 'diagram', attrs: { diagramRef: next } }]) })
      await flushPromises()

      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(2)
    })
  })
})
