import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import ChordBoxDiagram from '@/shared/components/songChart/ChordBoxDiagram.vue'
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
  return mount(ChordBoxDiagram, { props: { voicing, diagram, instrument: makeFrettedInstrument(), label: 'G7' } })
}

/** The dots as [string, fret, finger], low string first. */
function dots(wrapper: ReturnType<typeof mountBox>) {
  return wrapper.findAll('[data-test="finger-dot"]').map((d) => [Number(d.attributes('data-string')), Number(d.attributes('data-fret')), d.text()])
}

describe('ChordBoxDiagram', () => {
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

  it('draws the strings low to high, left to right', () => {
    const wrapper = mountBox(g7Open)

    const xOf = (string: number) => Number(wrapper.get(`[data-test="finger-dot"][data-string="${string}"]`).attributes('data-x'))
    expect(xOf(6)).toBeLessThan(xOf(5))
    expect(xOf(5)).toBeLessThan(xOf(1))
  })

  it('is described for screen readers', () => {
    expect(mountBox(g7Open).get('svg').attributes('aria-label')).toContain('G7')
  })
})
