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

function mountBox({ voicing, diagram }: ReturnType<typeof voicingOf>) {
  return mount(ChordBox, { props: { voicing, diagram, instrument: makeFrettedInstrument(), label: 'G7' } })
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
})
