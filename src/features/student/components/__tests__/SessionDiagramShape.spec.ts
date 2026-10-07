import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'

import type { components } from '@/api/generated/core-domain'
import type { GradedShapeAnswer } from '@/features/student/composables/usePracticeSessionRun'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'

type Item = components['schemas']['PracticeSessionItem']

const CAGED_A = '928330d5-903e-572c-9d41-5fde99d51ed1'
const LAYOUT = '6ea2d087-ab9c-59dc-9657-8546025414d2'

/** "C major — CAGED A, shift 3": roots on strings 5 and 3, the third on string 2 at fret 5. */
const diagram = makeFrettedDiagram({
  diagram_id: CAGED_A,
  instrument_id: LAYOUT,
  names: { en: 'C major — CAGED A, shift 3' },
  root_note: 'C',
  positions: [
    { position_id: 'p0', string: 5, fret: 3, interval: 'R', note_name: 'C', shape: 'dot' },
    { position_id: 'p1', string: 4, fret: 5, interval: '5', note_name: 'G', shape: 'dot' },
    { position_id: 'p2', string: 3, fret: 5, interval: 'R', note_name: 'C', shape: 'dot' },
    { position_id: 'p3', string: 2, fret: 5, interval: '3', note_name: 'E', shape: 'dot' },
    { position_id: 'p4', string: 1, fret: 3, interval: '5', note_name: 'G', shape: 'dot' },
  ],
})

const embedded = {
  status: ref<'loading' | 'ready' | 'unavailable'>('ready'),
  diagram: ref<unknown>(diagram),
  instrument: ref<unknown>(makeFrettedInstrument({ instrument_id: LAYOUT })),
  diagramRef: ref<unknown>(null),
  labelMode: ref('interval'),
}
const embeddedWith = vi.fn()
vi.mock('@/shared/composables/useEmbeddedDiagram', () => ({
  useEmbeddedDiagram: (source: unknown) => {
    embeddedWith(toValue(source as MaybeRefOrGetter<unknown>))
    return embedded
  },
}))

import SessionDiagramShape from '@/features/student/components/SessionDiagramShape.vue'

const MEMBERS = ['C', 'A', 'G', 'E', 'D']

function shapeItem(drill: 'name_the_shape' | 'find_the_degree'): Item {
  const naming = drill === 'name_the_shape'
  return {
    item_key: `diagram_shape:${CAGED_A}`,
    kind: 'diagram_shape',
    reason: 'new',
    node_id: null,
    level: 'new',
    estimated_seconds: 10,
    diagram_shape: {
      diagram_id: CAGED_A,
      layout_instrument_id: LAYOUT,
      drill,
      shape_family: 'caged-grip',
      shape: 'A',
      options: naming ? MEMBERS.map((member) => ({ shape: member, name: `${member} shape` })) : [],
      asked_interval: naming ? null : '3',
    },
  }
}

const naming = shapeItem('name_the_shape')
const finding = shapeItem('find_the_degree')

function mountShape(props: { item: Item; answer?: GradedShapeAnswer | null; instrumentName?: string }) {
  return mount(SessionDiagramShape, { props: { answer: null, ...props }, attachTo: document.body })
}

function cell(wrapper: ReturnType<typeof mountShape>, string: number, fret: number) {
  return wrapper.get(`[data-test="diagram-cell"][aria-label^="String ${string}, fret ${fret}"]`)
}

enableAutoUnmount(afterEach)

describe('SessionDiagramShape', () => {
  beforeEach(() => {
    embedded.status.value = 'ready'
    embeddedWith.mockClear()
    window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  })

  it('loads the shape’s diagram with its labels off', () => {
    mountShape({ item: naming })

    expect(embeddedWith).toHaveBeenCalledWith({ kind: 'single', ref: { diagram_id: CAGED_A, layers: { intervals: false, label: 'none' } } })
  })

  it('names the instrument the shape is drawn on, when the session mixes instruments', () => {
    expect(mountShape({ item: naming, instrumentName: 'Electric bass' }).get('[data-test="item-instrument"]').text()).toBe('Electric bass')
  })

  it('names no instrument when the session has one', () => {
    expect(mountShape({ item: naming }).find('[data-test="item-instrument"]').exists()).toBe(false)
  })

  it('shows why the shape was picked', () => {
    expect(mountShape({ item: naming }).get('[data-test="item-reason"]').text()).toBe('New')
  })

  it('holds its place while the diagram loads', () => {
    embedded.status.value = 'loading'
    const wrapper = mountShape({ item: naming })

    expect(wrapper.find('[data-test="shape-loading"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="diagram-canvas"]').exists()).toBe(false)
  })

  it('offers to skip a shape whose diagram can’t be shown', async () => {
    embedded.status.value = 'unavailable'
    const wrapper = mountShape({ item: naming })

    await wrapper.get('[data-test="skip-shape"]').trigger('click')

    expect(wrapper.emitted('next')).toHaveLength(1)
  })

  describe('name the shape', () => {
    it('shows the shape without its name or its labels, and offers every member of its family', () => {
      const wrapper = mountShape({ item: naming })

      expect(wrapper.get('[data-test="shape-prompt"]').text()).toBe('Which shape is this?')
      expect(wrapper.findAll('[data-test="diagram-position"]')).toHaveLength(5)
      expect(wrapper.findAll('[data-test="diagram-position-label"]')).toHaveLength(0)
      expect(wrapper.text()).not.toContain('C major')
      expect(wrapper.text()).not.toContain('CAGED')
      expect(wrapper.findAll('[data-test="shape-choice"]').map((choice) => choice.text())).toEqual([
        'C shape',
        'A shape',
        'G shape',
        'E shape',
        'D shape',
      ])
    })

    it('answers with the member picked, and the board its diagram draws', async () => {
      const wrapper = mountShape({ item: naming })

      await wrapper.findAll('[data-test="shape-choice"]')[3]!.trigger('click')

      const [answer, board] = wrapper.emitted('answer')![0]!
      expect(answer).toEqual({ response_type: 'name_the_shape', shape: 'E' })
      expect(board).toEqual({
        stringCount: 6,
        positions: [
          { string: 5, fret: 3, interval: 'R' },
          { string: 4, fret: 5, interval: '5' },
          { string: 3, fret: 5, interval: 'R' },
          { string: 2, fret: 5, interval: '3' },
          { string: 1, fret: 3, interval: '5' },
        ],
      })
    })

    it('reveals the right shape beside a wrong pick, and goes on from there', async () => {
      const wrapper = mountShape({ item: naming, answer: { answer: { response_type: 'name_the_shape', shape: 'E' }, correct: false } })

      const marks = wrapper.findAll('[data-test="shape-choice"]').map((choice) => choice.attributes('data-mark'))
      expect(marks).toEqual([undefined, 'right', undefined, 'wrong', undefined])
      expect(wrapper.findAll('[data-test="shape-choice"]')[1]!.text()).toContain('right answer')
      expect(wrapper.get('[data-test="answer-feedback"]').text()).toContain('Not quite')
      await wrapper.get('[data-test="next-item"]').trigger('click')
      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('takes no second pick once answered', async () => {
      const wrapper = mountShape({ item: naming, answer: { answer: { response_type: 'name_the_shape', shape: 'A' }, correct: true } })

      await wrapper.findAll('[data-test="shape-choice"]')[0]!.trigger('click')

      expect(wrapper.emitted('answer')).toBeUndefined()
    })
  })

  describe('find the degree', () => {
    it('asks for the degree on the shape, its roots marked and its other positions unlabelled', () => {
      const wrapper = mountShape({ item: finding })

      expect(wrapper.get('[data-test="shape-prompt"]').text()).toBe('Tap the 3 in this shape')
      expect(wrapper.findAll('[data-test="diagram-position-label"]').map((label) => label.text())).toEqual(['R', 'R'])
      expect(wrapper.findAll('[data-test="shape-choice"]')).toHaveLength(0)
    })

    it('lets any cell around the shape be tapped, on every string', () => {
      const wrapper = mountShape({ item: finding })

      // Frets 2 to 6: the shape's frets and one either side.
      expect(wrapper.findAll('[data-test="diagram-cell"]')).toHaveLength(6 * 5)
    })

    it('answers with the degree asked and the cell tapped', async () => {
      const wrapper = mountShape({ item: finding })

      await cell(wrapper, 3, 5).trigger('click')

      expect(wrapper.emitted('answer')![0]![0]).toEqual({ response_type: 'find_the_degree', interval: '3', string: 3, fret: 5 })
    })

    it('reveals where the degree is beside a wrong tap', () => {
      const wrapper = mountShape({
        item: finding,
        answer: { answer: { response_type: 'find_the_degree', interval: '3', string: 3, fret: 5 }, correct: false },
      })

      expect(cell(wrapper, 3, 5).find('[data-test="diagram-mark"]').attributes('data-mark')).toBe('wrong')
      expect(cell(wrapper, 2, 5).find('[data-test="diagram-mark"]').attributes('data-mark')).toBe('right')
      expect(wrapper.findAll('[data-test="diagram-mark"]')).toHaveLength(2)
    })

    it('marks only the tap when it is right', () => {
      const wrapper = mountShape({
        item: finding,
        answer: { answer: { response_type: 'find_the_degree', interval: '3', string: 2, fret: 5 }, correct: true },
      })

      expect(wrapper.findAll('[data-test="diagram-mark"]').map((mark) => mark.attributes('data-mark'))).toEqual(['right'])
    })
  })
})
