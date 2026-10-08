import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import ChordVoicingPickerList from '@/features/teacher/components/ChordVoicingPickerList.vue'
import { clearChordLookups } from '@/shared/composables/useChordLookup'
import { clearEmbeddedDiagramCache } from '@/shared/composables/useEmbeddedDiagram'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { chordG, gEShape, gOpen, makeVoicingDiagram } from '@/shared/testUtils/songChart'

const guitar = makeFrettedInstrument()

/** The catalog has G (open and at the 3rd fret); any other symbol that parses isn't in it. */
function serveCatalog() {
  GET.mockImplementation((path: string, init: { params: { query?: { symbol: string }; path?: { diagram_id: string } } }) => {
    if (path === '/instruments') return Promise.resolve({ data: [guitar] })
    if (path === '/diagrams/{diagram_id}') {
      const voicing = [gOpen, gEShape].find((v) => v.diagram_id === init.params.path?.diagram_id)
      return Promise.resolve(voicing ? { data: makeVoicingDiagram(voicing) } : { error: {} })
    }
    const symbol = init.params.query?.symbol ?? ''
    return Promise.resolve({
      data: { written_symbol: symbol, status: 'parsed', parsed: null, warning: null, chord: symbol === 'G' ? chordG : null, chord_without_bass: null },
    })
  })
}

function mountList() {
  return mount(ChordVoicingPickerList, {
    global: { stubs: { ChordBoxDiagram: { props: ['voicing'], template: '<div data-test="chord-box" :data-voicing-id="voicing.chord_voicing_id" />' } } },
  })
}

async function search(wrapper: ReturnType<typeof mountList>, symbol: string) {
  await wrapper.get('[data-test="chord-search"]').setValue(symbol)
  await flushPromises()
}

beforeEach(() => {
  GET.mockReset()
  serveCatalog()
  clearChordLookups()
  clearEmbeddedDiagramCache()
})

describe('ChordVoicingPickerList', () => {
  it("shows a chord's voicings as chord boxes, named by where they sit", async () => {
    const wrapper = mountList()

    await search(wrapper, 'G')

    const voicings = wrapper.findAll('[data-test="chord-voicing"]')
    expect(voicings.map((v) => v.find('[data-test="chord-voicing-name"]').text())).toEqual(['Open', '3fr'])
    expect(voicings.map((v) => v.get('[data-test="chord-box"]').attributes('data-voicing-id'))).toEqual(['g-open', 'g-e-shape-3'])
  })

  it("hands back the picked voicing's diagram", async () => {
    const wrapper = mountList()
    await search(wrapper, 'G')

    await wrapper.findAll('[data-test="chord-voicing"]')[1]!.trigger('click')

    expect(wrapper.emitted<[{ diagram_id: string }]>('select')?.[0]?.[0].diagram_id).toBe(gEShape.diagram_id)
  })

  it("says a symbol that isn't a chord isn't one", async () => {
    const wrapper = mountList()

    await search(wrapper, 'H7')

    expect(wrapper.get('[data-test="chord-search-status"]').attributes('data-kind')).toBe('not_a_chord')
    expect(wrapper.find('[data-test="chord-voicing"]').exists()).toBe(false)
  })

  it("says the catalog doesn't have a chord", async () => {
    const wrapper = mountList()

    await search(wrapper, 'C#7')

    expect(wrapper.get('[data-test="chord-search-status"]').attributes('data-kind')).toBe('not_in_catalog')
  })
})
