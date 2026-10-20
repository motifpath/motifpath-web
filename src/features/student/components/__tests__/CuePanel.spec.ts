import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import CuePanel from '@/features/student/components/CuePanel.vue'
import EmbeddedDiagram from '@/shared/components/diagram/EmbeddedDiagram.vue'
import { makeDiagramRef, makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeTimedCue } from '@/features/student/testing/expandedContent'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

function imageCue(overrides: Partial<ExpandedContent> = {}): ExpandedContent {
  return { ...makeTimedCue('a', 2, 4), ...overrides }
}

/** A copy of the cue with one of its optional fields removed. */
function cueWithout(cue: ExpandedContent, field: 'media_url' | 'rich_content' | 'diagram_ref'): ExpandedContent {
  const copy = { ...cue }
  delete copy[field]
  return copy
}

function richTextCue(text: string, overrides: Partial<ExpandedContent> = {}): ExpandedContent {
  const base = cueWithout(makeTimedCue('r', 2, 4), 'media_url')
  return { ...base, content_type: 'rich_text', rich_content: plainTextPrompt(text), ...overrides }
}

function diagramCue(overrides: Partial<ExpandedContent> = {}): ExpandedContent {
  const base = cueWithout(makeTimedCue('d', 6, 9), 'media_url')
  return { ...base, content_type: 'diagram', diagram_ref: makeDiagramRef(), ...overrides }
}

function mountCue(cue: ExpandedContent) {
  // The embedded diagram loads itself; its own spec covers that.
  return mount(CuePanel, { props: { cue }, global: { stubs: { EmbeddedDiagram: true } } })
}

describe('CuePanel', () => {
  describe('an image or GIF cue', () => {
    it.each(['image', 'gif'] as const)('shows the %s', (contentType) => {
      const wrapper = mountCue(
        imageCue({ content_type: contentType, media_url: 'https://cdn.example.test/cue.png' }),
      )

      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example.test/cue.png')
    })

    it.each([
      'javascript:alert(1)',
      'ftp://example.test/cue.png',
      '/relative/cue.png',
      'not a url',
    ])('shows nothing for the unsafe address %s', (unsafe) => {
      const wrapper = mountCue(imageCue({ media_url: unsafe }))

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('shows nothing when the cue has no address', () => {
      const wrapper = mountCue(cueWithout(imageCue(), 'media_url'))

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('shows the caption under the picture', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.get('figcaption').text()).toBe('A C major triad')
    })

    it('has no caption element when the cue has none', () => {
      const wrapper = mountCue(imageCue())

      expect(wrapper.find('figcaption').exists()).toBe(false)
    })

    it('treats the picture as decorative, since the caption already says what it shows', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.get('img').attributes('alt')).toBe('')
    })
  })

  describe('a rich-text cue', () => {
    it('shows the text', () => {
      const wrapper = mountCue(richTextCue('Keep your wrist relaxed.'))

      expect(wrapper.text()).toContain('Keep your wrist relaxed.')
    })

    it('shows the caption too when there is one', () => {
      const wrapper = mountCue(richTextCue('Keep your wrist relaxed.', { caption: 'Tip' }))

      expect(wrapper.get('figcaption').text()).toBe('Tip')
    })

    it('shows nothing when the cue has no text', () => {
      const wrapper = mountCue(cueWithout(richTextCue('x'), 'rich_content'))

      expect(wrapper.text()).toBe('')
    })
  })

  describe('a diagram cue', () => {
    it('shows the diagram with the cue\'s caption', () => {
      const wrapper = mountCue(diagramCue({ caption: 'Position 1 on the fretboard' }))

      const diagram = wrapper.getComponent(EmbeddedDiagram)
      expect(diagram.props('embed')).toEqual({ kind: 'single', ref: makeDiagramRef() })
      expect(diagram.props('caption')).toBe('Position 1 on the fretboard')
      // The diagram shows its own caption, so it can drop it when the diagram can't be shown.
      expect(wrapper.find('figcaption').exists()).toBe(false)
    })

    it('shows a stack of diagrams', () => {
      const stack = [makeDiagramRef(), makeDiagramRef({ diagram_id: 'diagram-2' })]
      const cue = cueWithout(diagramCue(), 'diagram_ref')
      const wrapper = mountCue({ ...cue, diagram_stack_ref: { stack } })

      expect(wrapper.getComponent(EmbeddedDiagram).props('embed')).toEqual({ kind: 'stack', stack })
    })

    it('shows the next diagram when playback moves straight on to another diagram cue', async () => {
      const box1 = makeFrettedDiagram()
      const box2 = makeFrettedDiagram({ diagram_id: 'diagram-2', positions: box1.positions.slice(0, 2) })
      GET.mockImplementation((path: string, init?: { params?: { path?: { diagram_id?: string } } }) => {
        const data = path === '/instruments' ? [makeFrettedInstrument()] : [box1, box2].find(
          (d) => d.diagram_id === init?.params?.path?.diagram_id,
        )
        return Promise.resolve({ data, error: undefined, response: { status: 200 } })
      })
      // Mounted for real, so what the student sees is the loaded diagram itself.
      const wrapper = mount(CuePanel, { props: { cue: diagramCue() } })
      await flushPromises()
      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(box1.positions.length)

      await wrapper.setProps({
        cue: diagramCue({ expanded_content_id: 'd2', diagram_ref: makeDiagramRef({ diagram_id: 'diagram-2' }) }),
      })
      await flushPromises()

      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(2)
    })

    it('shows nothing when the cue carries no usable diagram reference', () => {
      const wrapper = mountCue(diagramCue({ diagram_ref: makeDiagramRef({ diagram_id: '' }), caption: 'Box 1' }))

      expect(wrapper.findComponent(EmbeddedDiagram).exists()).toBe(false)
      expect(wrapper.text()).toBe('')
    })

    it('never shows a picture address a diagram cue happens to carry', () => {
      const wrapper = mountCue(diagramCue({ media_url: 'https://cdn.example.test/cue.png' }))

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.findComponent(EmbeddedDiagram).exists()).toBe(true)
    })
  })

  describe('layout', () => {
    it('adds no heading or label of its own, so it reads as part of the lesson', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.find('h1, h2, h3, h4, h5, h6, legend').exists()).toBe(false)
    })

    it('uses no inline styles', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.find('[style]').exists()).toBe(false)
    })
  })
})
