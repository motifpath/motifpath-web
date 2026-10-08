import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import type { components } from '@/api/generated/core-domain'
import SongChartLyricsEditor from '@/features/admin/components/songChartEditor/SongChartLyricsEditor.vue'
import { clearChordLookups } from '@/features/admin/composables/useChordLookup'
import { chordC, chordG, gEShape, makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

/** The catalog has G and C; anything else that parses isn't in it. */
function serveCatalog() {
  GET.mockImplementation((_path: string, init: { params: { query: { symbol: string } } }) => {
    const symbol = init.params.query.symbol
    const chord = symbol === 'G' ? chordG : symbol === 'C' ? chordC : null
    return Promise.resolve({ data: { written_symbol: symbol, status: 'parsed', parsed: null, warning: null, chord, chord_without_bass: null } })
  })
}

beforeEach(() => {
  GET.mockReset()
  serveCatalog()
  clearChordLookups()
})

const plainLine: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Ciranda', null])])] }

/** The anchors of the last emitted document, as [written symbol, text, picked voicing]. */
function emittedChords(wrapper: ReturnType<typeof mountEditor>): Array<[string, string, string | null]> {
  return lastEmitted(wrapper).content.flatMap((s) =>
    s.content.flatMap((line) =>
      line.type === 'lyricLine'
        ? line.content.flatMap((r) => (r.marks ?? []).map((m): [string, string, string | null] => [m.attrs.writtenSymbol, r.text, m.attrs.chordVoicingId]))
        : [],
    ),
  )
}

async function writeChord(wrapper: ReturnType<typeof mountEditor>, symbol: string) {
  await wrapper.get('[data-test="chord-symbol-input"]').setValue(symbol)
  await wrapper.get('[data-test="put-chord"]').trigger('click')
  await flushPromises()
}

type SongChartDocument = components['schemas']['SongChartDocument']

function mountEditor(doc: SongChartDocument = makeLearnerSongChart().body) {
  return mount(SongChartLyricsEditor, { props: { modelValue: doc } })
}

function lastEmitted(wrapper: ReturnType<typeof mountEditor>): SongChartDocument {
  const events = wrapper.emitted<[SongChartDocument]>('update:modelValue')
  if (!events?.length) throw new Error('update:modelValue was never emitted')
  return events[events.length - 1]![0]
}

describe('SongChartLyricsEditor', () => {
  it('shows the lyrics with each chord on its word, and each section', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    expect(wrapper.text()).toContain('Quando olhei a terra ardendo')
    expect(wrapper.findAll('[data-chord]').map((c) => [c.attributes('data-chord'), c.element.textContent])).toEqual([
      ['G', 'Quando olhei a '],
      ['C', 'terra ardendo'],
      ['G', 'Que braseiro'],
    ])
    expect(wrapper.findAll('section[data-kind]').map((s) => [s.attributes('data-kind'), s.attributes('data-label') ?? null])).toEqual([
      ['verse', null],
      ['chorus', 'Refrão'],
    ])
  })

  it("changes the kind and label of the section the cursor is in", async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="section-kind"]').setValue('intro')
    await wrapper.get('[data-test="section-label"]').setValue('Abertura')
    await wrapper.get('[data-test="section-label"]').trigger('change')

    expect(lastEmitted(wrapper).content[0]!.attrs).toEqual({ kind: 'intro', label: 'Abertura' })
  })

  it('adds a section of the chosen kind after the one the cursor is in', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="add-section"]').trigger('click')

    expect(wrapper.findAll('section[data-kind]')).toHaveLength(3)
  })

  it('adds a comment line', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="add-comment"]').trigger('click')

    expect(wrapper.findAll('p[data-comment]')).toHaveLength(1)
  })

  it('shows lyrics given from outside, such as an import, in place of what it held', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.setProps({
      modelValue: { type: 'doc', content: [makeSection([makeLyricLine(['Ciranda', makeAnchor('a1', 'C')])])] },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('Ciranda')
    expect(wrapper.text()).not.toContain('Quando olhei')
  })

  it('starts a new chart with one empty verse to write in', async () => {
    const wrapper = mountEditor({ type: 'doc', content: [] })
    await flushPromises()

    expect(wrapper.findAll('section[data-kind="verse"]')).toHaveLength(1)
    expect(wrapper.findAll('p[data-lyric-line]')).toHaveLength(1)
  })

  describe('chords', () => {
    it('puts a chord on the selected text', async () => {
      const wrapper = mountEditor(plainLine)
      await flushPromises()
      await wrapper.get('.ProseMirror').trigger('keydown', { key: 'a', ctrlKey: true })

      await writeChord(wrapper, 'D')

      expect(emittedChords(wrapper)).toEqual([['D', 'Ciranda', null]])
    })

    it('changes the chord at the cursor, clearing a voicing picked for the old one', async () => {
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'G', { chordVoicingId: gEShape.chord_voicing_id })])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()

      const input = wrapper.get('[data-test="chord-symbol-input"]').element
      expect(input instanceof HTMLInputElement && input.value).toBe('G')
      await writeChord(wrapper, 'C')

      expect(emittedChords(wrapper)).toEqual([['C', 'Quando', null]])
    })

    it('removes the chord at the cursor', async () => {
      const wrapper = mountEditor()
      await flushPromises()

      await wrapper.get('[data-test="remove-chord"]').trigger('click')
      await flushPromises()

      expect(emittedChords(wrapper).map(([symbol]) => symbol)).toEqual(['C', 'G'])
    })

    it.each([
      ['H7', 'not_a_chord', 'true'],
      ['C#7', 'not_in_catalog', 'true'],
      ['N.C.', 'no_chord', 'false'],
    ])('marks %s as it is written', async (symbol, kind, blocks) => {
      const wrapper = mountEditor(plainLine)
      await flushPromises()

      await wrapper.get('[data-test="chord-symbol-input"]').setValue(symbol)
      await flushPromises()

      const status = wrapper.get('[data-test="chord-status"]')
      expect(status.attributes('data-kind')).toBe(kind)
      expect(status.attributes('data-blocks')).toBe(blocks)
    })

    it('lists the chords in the lyrics that block publishing', async () => {
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['La ', makeAnchor('a1', 'H7')], ['lo', makeAnchor('a2', 'G')])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()

      expect(wrapper.findAll('[data-test="chord-to-fix"]').map((c) => c.attributes('data-symbol'))).toEqual(['H7'])
    })

    it("offers the chord's voicings, the best one used until another is picked", async () => {
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Quando', makeAnchor('a1', 'G')])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()

      const options = wrapper.findAll('[data-test="voicing-option"]')
      expect(options.map((o) => o.attributes('data-voicing-id'))).toEqual(['', ...chordG.voicings.map((v) => v.chord_voicing_id)])
      expect(options[0]!.attributes('aria-checked')).toBe('true')

      await options[2]!.trigger('click')
      await flushPromises()

      expect(emittedChords(wrapper)).toEqual([['G', 'Quando', gEShape.chord_voicing_id]])
    })
  })
})
