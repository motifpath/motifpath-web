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

function mountList(props: { pickedDiagramId?: string | null } = {}) {
  return mount(ChordVoicingPickerList, {
    props,
    global: { stubs: { ChordBox: { props: ['voicing'], template: '<div data-test="chord-box" :data-voicing-id="voicing.chord_voicing_id" />' } } },
  })
}

async function search(wrapper: ReturnType<typeof mountList>, symbol: string) {
  await wrapper.get('[data-test="chord-search"]').setValue(symbol)
  await flushPromises()
}

async function chooseRoot(wrapper: ReturnType<typeof mountList>, root: string) {
  await wrapper.get('[data-test="chord-root"]').setValue(root)
  await flushPromises()
}

async function chooseQuality(wrapper: ReturnType<typeof mountList>, label: string) {
  const quality = wrapper.findAll('[data-test="chord-quality"]').find((q) => q.text() === label)
  await quality!.trigger('click')
  await flushPromises()
}

const voicingNamesOf = (wrapper: ReturnType<typeof mountList>) =>
  wrapper.findAll('[data-test="chord-voicing-name"]').map((n) => n.text())

const askedSymbols = () =>
  GET.mock.calls.filter(([path]) => path === '/chords').map(([, init]) => (init as { params: { query: { symbol: string } } }).params.query.symbol)

beforeEach(() => {
  GET.mockReset()
  serveCatalog()
  clearChordLookups()
  clearEmbeddedDiagramCache()
})

describe('ChordVoicingPickerList', () => {
  describe('by root and quality', () => {
    it('offers every quality, one at a time, starting on Major', () => {
      const wrapper = mountList()

      const qualities = wrapper.findAll('[data-test="chord-quality"]')
      expect(qualities.map((q) => q.text())).toEqual(['Major', 'm', '7', 'm7', 'maj7', 'sus2', 'sus4', 'dim', 'aug'])
      expect(qualities.filter((q) => q.attributes('aria-pressed') === 'true').map((q) => q.text())).toEqual(['Major'])
    })

    it("lists a root's plain chord, each voicing named by its chord and where it sits", async () => {
      const wrapper = mountList()

      await chooseRoot(wrapper, 'G')

      expect(voicingNamesOf(wrapper)).toEqual(['G · Open', 'G · 3fr'])
      expect(wrapper.findAll('[data-test="chord-box"]').map((b) => b.attributes('data-voicing-id'))).toEqual(['g-open', 'g-e-shape-3'])
    })

    it('chooses only one quality at a time, and looks up the chord they make', async () => {
      const wrapper = mountList()
      await chooseRoot(wrapper, 'G')

      await chooseQuality(wrapper, 'm')
      await chooseQuality(wrapper, 'm7')

      const pressed = wrapper.findAll('[data-test="chord-quality"]').filter((q) => q.attributes('aria-pressed') === 'true')
      expect(pressed.map((q) => q.text())).toEqual(['m7'])
      expect(askedSymbols()).toContain('Gm7')
    })
  })

  describe('by a typed symbol', () => {
    it.each(['g', 'G', ' g '])('reads "%s" in any case', async (typed) => {
      const wrapper = mountList()

      await search(wrapper, typed)

      expect(voicingNamesOf(wrapper)).toEqual(['G · Open', 'G · 3fr'])
    })

    it('takes over from the root and quality, which a new choice takes back', async () => {
      const wrapper = mountList()
      await search(wrapper, 'g')
      expect(wrapper.findAll('[data-test="chord-quality"]').some((q) => q.attributes('aria-pressed') === 'true')).toBe(false)

      await chooseRoot(wrapper, 'C')

      expect((wrapper.get('[data-test="chord-search"]').element as HTMLInputElement).value).toBe('')
      expect(askedSymbols()).toContain('C')
    })

    it("says in words that a symbol isn't a chord, with no message key", async () => {
      const wrapper = mountList()

      await search(wrapper, 'h7')

      const status = wrapper.get('[data-test="chord-search-status"]')
      expect(status.attributes('data-kind')).toBe('not_a_chord')
      expect(status.text()).toBe('“h7” isn’t a chord we can read.')
      expect(wrapper.find('[data-test="chord-voicing"]').exists()).toBe(false)
    })

    it("says the catalog doesn't have a chord", async () => {
      const wrapper = mountList()

      await search(wrapper, 'C#7')

      const status = wrapper.get('[data-test="chord-search-status"]')
      expect(status.attributes('data-kind')).toBe('not_in_catalog')
      expect(status.text()).toBe('The chord catalog doesn’t have “C#7”.')
    })
  })

  it("hands back the picked voicing's diagram", async () => {
    const wrapper = mountList()
    await search(wrapper, 'G')

    await wrapper.findAll('[data-test="chord-voicing"]')[1]!.trigger('click')

    expect(wrapper.emitted<[{ diagram_id: string }]>('select')?.[0]?.[0].diagram_id).toBe(gEShape.diagram_id)
  })

  it('marks the voicing already picked', async () => {
    const wrapper = mountList({ pickedDiagramId: gEShape.diagram_id })
    await search(wrapper, 'G')

    const marked = wrapper.findAll('[data-test="chord-voicing"]').filter((v) => v.attributes('aria-current') === 'true')
    expect(marked.map((v) => v.get('[data-test="chord-voicing-name"]').text())).toEqual(['G · 3fr'])
  })
})
