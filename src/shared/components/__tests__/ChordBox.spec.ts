import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import ChordBox from '@/shared/components/diagram/ChordBox.vue'
import { makeFrettedDiagram, makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { makeVoicing } from '@/shared/testUtils/songChart'

type Position = components['schemas']['Diagram']['positions'][number]
type Finger = components['schemas']['ChordVoicing']['fingering'][number]['finger']

/** A voicing from [string, fret, finger] per sounding string; fret 0 is an open string. */
function voicingOf(id: string, notes: Array<[number, number, Finger | null]>, lowest: number, highest: number, muted: number[] = []) {
  const positions: Position[] = notes.map(([string, fret], i) => ({ position_id: `${id}-p${i}`, string, fret, interval: 'R', note_name: 'G', shape: 'dot' }))
  const fingering = notes.flatMap(([, , finger], i) => (finger ? [{ position_id: `${id}-p${i}`, finger }] : []))
  const voicing = makeVoicing(id, 'chord-g', { fret_window: { lowest_fret: lowest, highest_fret: highest }, fingering, muted_strings: muted })
  return { voicing, diagram: makeFrettedDiagram({ diagram_id: voicing.diagram_id, positions }) }
}

const g7Open = voicingOf('g7-open', [[6, 3, '3'], [5, 2, '2'], [4, 0, null], [3, 0, null], [2, 0, null], [1, 1, '1']], 0, 3)
const gBarre3 = voicingOf('g-e-shape-3', [[6, 3, '1'], [5, 5, '3'], [4, 5, '4'], [3, 4, '2'], [2, 3, '1'], [1, 3, '1']], 3, 5)
const cOpen = voicingOf('c-open', [[5, 3, '3'], [4, 2, '2'], [3, 0, null], [2, 1, '1'], [1, 0, null]], 0, 3, [6])

function mountBox({ voicing, diagram }: ReturnType<typeof voicingOf>, extra: Record<string, unknown> = {}) {
  return mount(ChordBox, { props: { voicing, diagram, instrument: makeFrettedInstrument(), label: 'G7', ...extra } })
}

/** Each note's state, keyed "string/fret": its dot, or the "o" of an open string. */
function states(wrapper: ReturnType<typeof mountBox>) {
  return Object.fromEntries(
    wrapper.findAll('[data-test="finger-dot"], [data-test="string-open"]').map((n) => [`${n.attributes('data-string')}/${n.attributes('data-fret') ?? 0}`, n.attributes('data-state')]),
  )
}

/** How big a place is on screen, in CSS px: its target in the drawing, scaled as the box is drawn. */
function placeSize(wrapper: ReturnType<typeof mountBox>, target: ReturnType<ReturnType<typeof mountBox>['get']>) {
  const svg = wrapper.get('svg')
  const viewBoxWidth = Number(svg.attributes('viewBox')!.split(' ')[2])
  const ratio = Number(svg.attributes('width')) / viewBoxWidth
  return { width: Number(target.attributes('width')) * ratio, height: Number(target.attributes('height')) * ratio }
}

/** The dots as [string, fret, finger], low string first. */
function dots(wrapper: ReturnType<typeof mountBox>) {
  return wrapper.findAll('[data-test="finger-dot"]').map((d) => [Number(d.attributes('data-string')), Number(d.attributes('data-fret')), d.text()])
}

describe('ChordBox', () => {
  it("draws an open voicing from the nut, with each finger's number on its dot", () => {
    const wrapper = mountBox(g7Open)

    expect(wrapper.find('[data-test="nut"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fret-label"]').exists()).toBe(false)
    expect(dots(wrapper)).toEqual([
      [6, 3, '3'],
      [5, 2, '2'],
      [1, 1, '1'],
    ])
  })

  it("writes a root dot's finger number in the surface colour, so it reads on the ink dot in light and dark", () => {
    const wrapper = mountBox(g7Open)

    const root = wrapper.findAll('[data-test="finger-dot"]').find((d) => d.get('circle').classes('fill-ink'))!
    expect(root.get('text').classes()).toContain('fill-surface')
  })

  it('marks open strings "o" and muted strings "x" above the box', () => {
    const wrapper = mountBox(cOpen)

    expect(wrapper.findAll('[data-test="string-open"]').map((m) => Number(m.attributes('data-string')))).toEqual([3, 1])
    expect(wrapper.findAll('[data-test="string-muted"]').map((m) => Number(m.attributes('data-string')))).toEqual([6])
    expect(wrapper.get('[data-test="string-muted"]').text()).toBe('x')
    expect(wrapper.get('[data-test="string-open"]').text()).toBe('o')
  })

  it('draws a voicing up the neck from its first fret, labelled with it, without a nut', () => {
    const wrapper = mountBox(gBarre3)

    expect(wrapper.find('[data-test="nut"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="fret-label"]').text()).toBe('3fr')
    expect(wrapper.findAll('[data-test="fret-row"]')).toHaveLength(4)
    expect(dots(wrapper)).toContainEqual([5, 5, '3'])
  })

  it('starts a voicing with open strings at the nut, however high its fingers sit', () => {
    const aOpen = voicingOf('a-open', [[5, 0, null], [4, 2, '1'], [3, 2, '2'], [2, 2, '3'], [1, 0, null]], 2, 2, [6])
    const wrapper = mountBox(aOpen)

    expect(wrapper.find('[data-test="nut"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="fret-label"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="fret-row"]')).toHaveLength(4)
    // On the 2nd fret: in the second row, not the first.
    const rowOf = (dot: ReturnType<typeof wrapper.find>) => Number(dot.attributes('data-row'))
    expect(wrapper.findAll('[data-test="finger-dot"]').map(rowOf)).toEqual([2, 2, 2])
  })

  it('always shows at least four frets', () => {
    expect(mountBox(gBarre3).findAll('[data-test="fret-row"]')).toHaveLength(4)
  })

  it('shows every fret a voicing with open strings reaches, past the 4th too', () => {
    const cStretch = voicingOf('c-stretch', [[5, 3, '2'], [4, 2, '1'], [3, 0, null], [2, 1, null], [1, 5, '4']], 1, 5, [6])
    const wrapper = mountBox(cStretch)

    expect(wrapper.find('[data-test="nut"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="fret-row"]')).toHaveLength(5)
  })

  it('draws the strings low to high, left to right', () => {
    const wrapper = mountBox(g7Open)

    const xOf = (string: number) => Number(wrapper.get(`[data-test="finger-dot"][data-string="${string}"]`).attributes('data-x'))
    expect(xOf(6)).toBeLessThan(xOf(5))
    expect(xOf(5)).toBeLessThan(xOf(1))
  })

  it('draws at a larger scale for practice, so every dot is at least 28 px', () => {
    const wrapper = mount(ChordBox, { props: { ...g7Open, instrument: makeFrettedInstrument(), label: 'G7', scale: 2 } })

    const svg = wrapper.get('svg')
    const plain = mountBox(g7Open).get('svg')
    expect(Number(svg.attributes('width'))).toBe(2 * Number(plain.attributes('width')))
    expect(svg.attributes('viewBox')).toBe(plain.attributes('viewBox'))
    expect(2 * 2 * Number(wrapper.get('[data-test="finger-dot"] circle').attributes('r'))).toBeGreaterThanOrEqual(28)
  })

  it('rings the dots and open strings sounding right now', () => {
    const wrapper = mount(ChordBox, {
      props: { ...g7Open, instrument: makeFrettedInstrument(), label: 'G7', activePositionIds: ['g7-open-p0', 'g7-open-p2'] },
    })

    const rings = wrapper.findAll('[data-test="chord-sounding"]')
    expect(rings.map((ring) => ring.attributes('data-string'))).toEqual(['6', '4'])
  })

  it('is described for screen readers', () => {
    expect(mountBox(g7Open).get('svg').attributes('aria-label')).toContain('G7')
  })

  describe('where its notes are answers', () => {
    // C open: string 5 fret 3 (p0), string 4 fret 2 (p1), string 3 open (p2), string 2 fret 1 (p3), string 1 open (p4).
    const p = (i: number) => `c-open-p${i}`

    it('leaves hidden notes out for a student, open strings included', () => {
      const wrapper = mountBox(cOpen, { hiddenPositionIds: [p(1), p(2)] })

      expect(dots(wrapper).map(([string, fret]) => `${string}/${fret}`)).toEqual(['5/3', '2/1'])
      expect(wrapper.findAll('[data-test="string-open"]').map((m) => Number(m.attributes('data-string')))).toEqual([1])
    })

    it('shows an author its hidden notes faded, and its answers marked', () => {
      const wrapper = mountBox(cOpen, { hiddenPositionIds: [p(1), p(2)], revealHidden: true, correctPositionIds: [p(0), p(1)] })

      expect(states(wrapper)).toEqual({ '5/3': 'correct', '4/2': 'hidden-correct', '3/0': 'hidden', '2/1': 'default', '1/0': 'default' })
    })

    it("takes a tap on each of an author's notes, open strings included", async () => {
      const wrapper = mountBox(cOpen, { selectablePositionIds: [p(0), p(1), p(2), p(3), p(4)] })

      expect(wrapper.get('svg').attributes('role')).toBe('group')
      await wrapper.get('[data-test="finger-dot"][data-string="4"]').trigger('click')
      await wrapper.get('[data-test="string-open"][data-string="3"]').trigger('keydown', { key: 'Enter' })
      await wrapper.get('[data-test="finger-dot"][data-string="2"]').trigger('keydown', { key: ' ' })

      expect(wrapper.emitted('select')).toEqual([[p(1)], [p(2)], [p(3)]])
      expect(wrapper.get('[data-test="finger-dot"][data-string="4"]').attributes('aria-label')).toBe('String 4, fret 2, finger 2')
      expect(wrapper.get('[data-test="string-open"][data-string="3"]').attributes('aria-label')).toBe('String 3, fret 0')
    })

    describe("a student's answer cells", () => {
      const cells = [
        { optionId: 'o-4-2', string: 4, fret: 2 },
        { optionId: 'o-3-2', string: 3, fret: 2 },
        { optionId: 'o-3-3', string: 3, fret: 3 },
        { optionId: 'o-3-0', string: 3, fret: 0 },
      ]
      const student = (extra: Record<string, unknown> = {}) =>
        mountBox(cOpen, { hiddenPositionIds: [p(1), p(2)], answerCells: cells, multiple: true, ...extra })
      const cell = (wrapper: ReturnType<typeof mountBox>, optionId: string) => wrapper.get(`[data-test="chord-cell"][data-option-id="${optionId}"]`)

      it('offers every cell as a place to tap, named by where it sits, the open string above the nut included', async () => {
        const wrapper = student()

        expect(wrapper.findAll('[data-test="chord-cell"]').map((c) => c.attributes('aria-label'))).toEqual([
          'String 4, fret 2',
          'String 3, fret 2',
          'String 3, fret 3',
          'String 3, fret 0',
        ])
        await cell(wrapper, 'o-3-0').trigger('click')
        await cell(wrapper, 'o-4-2').trigger('keydown', { key: 'Enter' })
        expect(wrapper.emitted('selectAnswer')).toEqual([['o-3-0'], ['o-4-2']])
      })

      it('marks a picked cell', () => {
        const wrapper = student({ selectedAnswerIds: ['o-4-2'] })

        expect(cell(wrapper, 'o-4-2').attributes('data-state')).toBe('asked')
        expect(cell(wrapper, 'o-4-2').attributes('aria-checked')).toBe('true')
        expect(cell(wrapper, 'o-3-2').attributes('data-state')).toBe('empty')
      })

      it('grades picks on the box: right, wrong, and a right cell not picked', () => {
        const wrapper = student({ selectedAnswerIds: ['o-4-2', 'o-3-3'], answerMarks: { 'o-4-2': 'right', 'o-3-2': 'right', 'o-3-3': 'wrong' } })

        expect(cell(wrapper, 'o-4-2').attributes('data-state')).toBe('right')
        expect(cell(wrapper, 'o-3-3').attributes('data-state')).toBe('wrong')
        expect(cell(wrapper, 'o-3-2').attributes('data-state')).toBe('missed')
        expect(cell(wrapper, 'o-3-3').attributes('aria-label')).toBe('String 3, fret 3, your answer, wrong')
      })

      it('draws every place at least 48 px each way', () => {
        const wrapper = student()

        const targets = wrapper.findAll('[data-test="chord-cell-target"]')
        expect(targets).toHaveLength(cells.length)
        for (const target of targets) {
          const size = placeSize(wrapper, target)
          expect(size.width).toBeGreaterThanOrEqual(48)
          expect(size.height).toBeGreaterThanOrEqual(48)
        }
      })

      it('grows to show a cell beyond its frets', () => {
        const wrapper = student({ answerCells: [...cells, { optionId: 'o-1-5', string: 1, fret: 5 }] })

        expect(wrapper.findAll('[data-test="fret-row"]')).toHaveLength(5)
      })
    })
  })

  it('fits its container as a thumbnail', () => {
    const svg = mountBox(cOpen, { fit: true }).get('svg')

    expect(svg.attributes('width')).toBeUndefined()
    expect(svg.classes()).toContain('w-full')
  })
})
