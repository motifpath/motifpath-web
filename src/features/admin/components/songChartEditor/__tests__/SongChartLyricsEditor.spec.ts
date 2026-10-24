import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

enableAutoUnmount(afterEach)

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import type { components } from '@/api/generated/core-domain'
import SongChartLyricsEditor from '@/features/admin/components/songChartEditor/SongChartLyricsEditor.vue'
import { clearChordLookups } from '@/shared/composables/useChordLookup'
import { clearProgressionCatalog } from '@/shared/composables/useProgressionCatalog'
import { makeFrettedInstrument } from '@/shared/testUtils/diagram'
import { chordC, chordG, gEShape, makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection, makeVoicingDiagram } from '@/shared/testUtils/songChart'

const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
const PROGRESSIONS = [progression('I-IV-V-I', 'I–IV–V–I'), progression('I-IV-I-V', 'I–IV–I–V')]

/** The catalog has G and C, with their voicings' diagrams; anything else that parses isn't in it. */
function serveCatalog() {
  GET.mockImplementation((path: string, init: { params: { query: { symbol: string }; path: { diagram_id: string } } }) => {
    if (path === '/instruments') return Promise.resolve({ data: [makeFrettedInstrument()] })
    if (path === '/progressions') return Promise.resolve({ data: PROGRESSIONS })
    if (path === '/diagrams/{diagram_id}') {
      const voicing = [...chordG.voicings, ...chordC.voicings].find((v) => v.diagram_id === init.params.path.diagram_id)
      return Promise.resolve(voicing ? { data: makeVoicingDiagram(voicing) } : { error: { message: 'not found' } })
    }
    const symbol = init.params.query.symbol
    const chord = symbol === 'G' ? chordG : symbol === 'C' ? chordC : null
    return Promise.resolve({ data: { written_symbol: symbol, status: 'parsed', parsed: null, warning: null, chord, chord_without_bass: null } })
  })
}

beforeEach(() => {
  GET.mockReset()
  serveCatalog()
  clearChordLookups()
  clearProgressionCatalog()
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

/** The editor redraws its toolbar (what Undo can do) two animation frames after a change. */
async function toolbarRedrawn() {
  for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
  await flushPromises()
}

/** Opens the chord popover at the selection or the chord at the cursor, as Chord does. */
async function openChord(wrapper: ReturnType<typeof mountEditor>) {
  await wrapper.get('[data-test="open-chord"]').trigger('click')
  await flushPromises()
}

async function writeChord(wrapper: ReturnType<typeof mountEditor>, symbol: string) {
  if (!wrapper.find('[data-test="chord-popover"]').exists()) await openChord(wrapper)
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

    expect(wrapper.text()).toContain('Amazing grace, how sweet the sound')
    expect(wrapper.findAll('[data-chord]').map((c) => [c.attributes('data-chord'), c.element.textContent])).toEqual([
      ['G', 'Amazing grace, how '],
      ['C', 'sweet the sound'],
      ['G', "'Twas grace that taught"],
    ])
    expect(wrapper.findAll('section[data-kind]').map((s) => [s.attributes('data-kind'), s.attributes('data-label') ?? null])).toEqual([
      ['verse', null],
      ['chorus', 'Chorus'],
    ])
  })

  it("changes the kind and label of the section the cursor is in", async () => {
    const wrapper = mountEditor()
    await flushPromises()

    await wrapper.get('[data-test="section-kind"]').setValue('intro')
    await wrapper.get('[data-test="section-label"]').setValue('Abertura')
    await wrapper.get('[data-test="section-label"]').trigger('change')

    expect(lastEmitted(wrapper).content[0]!.attrs).toEqual({ kind: 'intro', label: 'Abertura', progression_keys: [] })
  })

  it('keeps the progressions a section is tagged with when its kind and label change', async () => {
    const tagged = makeSection([makeLyricLine(['Amazing grace', makeAnchor('a1', 'G')])], { progression_keys: ['I-IV-I-V'] })
    const wrapper = mountEditor({ type: 'doc', content: [tagged] })
    await flushPromises()

    await wrapper.get('[data-test="section-kind"]').setValue('chorus')
    await wrapper.get('[data-test="section-label"]').setValue('Refrão')
    await wrapper.get('[data-test="section-label"]').trigger('change')

    expect(lastEmitted(wrapper).content[0]!.attrs).toEqual({ kind: 'chorus', label: 'Refrão', progression_keys: ['I-IV-I-V'] })
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
    expect(wrapper.text()).not.toContain('Amazing grace')
  })

  it('starts a new chart with one empty verse to write in', async () => {
    const wrapper = mountEditor({ type: 'doc', content: [] })
    await flushPromises()

    expect(wrapper.findAll('section[data-kind="verse"]')).toHaveLength(1)
    expect(wrapper.findAll('p[data-lyric-line]')).toHaveLength(1)
  })

  describe('the progressions a section plays', () => {
    const twoSections: SongChartDocument = {
      type: 'doc',
      content: [
        makeSection([makeLyricLine(['Amazing grace', makeAnchor('a1', 'G')])], { progression_keys: ['I-IV-I-V'] }),
        makeSection([makeLyricLine(['How sweet', makeAnchor('a2', 'C')])], { kind: 'chorus' }),
      ],
    }
    const headings = (wrapper: ReturnType<typeof mountEditor>) => wrapper.findAll('[data-test="section-heading"]')

    it("heads each section with its name and the progressions it's tagged with, by name", async () => {
      const wrapper = mountEditor(twoSections)
      await flushPromises()

      expect(headings(wrapper).map((h) => [h.get('[data-test="section-name"]').text(), h.findAll('[data-test="progression-chip"]').map((c) => c.text())])).toEqual([
        ['Verse', ['I–IV–I–V']],
        ['Chorus', []],
      ])
    })

    it("tags the section whose + Progression opened the picker, and unchecks a tag it's picked again", async () => {
      const wrapper = mountEditor(twoSections)
      await flushPromises()

      await headings(wrapper)[1]!.get('[data-test="add-progression"]').trigger('click')
      const picker = () => wrapper.get('[data-test="progression-picker"]')
      await picker().findAll('[data-test="progression-option"]')[0]!.trigger('click')
      expect(lastEmitted(wrapper).content.map((s) => s.attrs.progression_keys)).toEqual([['I-IV-I-V'], ['I-IV-V-I']])

      await picker().findAll('[data-test="progression-option"]')[0]!.trigger('click')
      expect(lastEmitted(wrapper).content.map((s) => s.attrs.progression_keys)).toEqual([['I-IV-I-V'], []])
    })

    it('removes a tag with its ×, and Undo brings it back', async () => {
      const wrapper = mountEditor(twoSections)
      await flushPromises()

      await headings(wrapper)[0]!.get('[data-test="remove-progression"]').trigger('click')
      expect(lastEmitted(wrapper).content[0]!.attrs.progression_keys).toEqual([])

      await toolbarRedrawn()
      await wrapper.get('[data-test="undo"]').trigger('click')
      expect(lastEmitted(wrapper).content[0]!.attrs.progression_keys).toEqual(['I-IV-I-V'])
    })

    it('closes the picker with Escape', async () => {
      const wrapper = mountEditor(twoSections)
      await flushPromises()

      await headings(wrapper)[0]!.get('[data-test="add-progression"]').trigger('click')
      await wrapper.get('[data-test="progression-picker"]').trigger('keydown', { key: 'Escape' })

      expect(wrapper.find('[data-test="progression-picker"]').exists()).toBe(false)
    })

    it("marks a tag the last save found the section doesn't play, with why under its heading", async () => {
      const wrapper = mount(SongChartLyricsEditor, {
        props: { modelValue: twoSections, unplayed: [{ section_index: 0, progression_key: 'I-IV-I-V' }], concertKey: 'C' },
      })
      await flushPromises()

      expect(headings(wrapper)[0]!.get('[data-test="progression-chip"]').attributes('data-unplayed')).toBe('true')
      expect(headings(wrapper)[0]!.get('[data-test="not-played"]').text()).toContain('its chords never come I–IV–I–V in a row in C')
      expect(headings(wrapper)[1]!.find('[data-test="not-played"]').exists()).toBe(false)
    })
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
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Amazing', makeAnchor('a1', 'G', { chordVoicingId: gEShape.chord_voicing_id })])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()
      await openChord(wrapper)

      const input = wrapper.get('[data-test="chord-symbol-input"]').element
      expect(input instanceof HTMLInputElement && input.value).toBe('G')
      await writeChord(wrapper, 'C')

      expect(emittedChords(wrapper)).toEqual([['C', 'Amazing', null]])
    })

    it('removes the chord at the cursor', async () => {
      const wrapper = mountEditor()
      await flushPromises()
      await openChord(wrapper)

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
      await wrapper.get('.ProseMirror').trigger('keydown', { key: 'a', ctrlKey: true })
      await openChord(wrapper)

      await wrapper.get('[data-test="chord-symbol-input"]').setValue(symbol)
      await flushPromises()

      const status = wrapper.get('[data-test="chord-status"]')
      expect(status.attributes('data-kind')).toBe(kind)
      expect(status.attributes('data-blocks')).toBe(blocks)
    })

    it('marks a chord problem where it is written, with the reason under its line', async () => {
      const doc: SongChartDocument = {
        type: 'doc',
        content: [makeSection([makeLyricLine(['La ', makeAnchor('a1', 'H7')]), makeLyricLine(['lo ', makeAnchor('a2', 'C#7')]), makeLyricLine(['li', makeAnchor('a3', 'G')])])],
      }
      const wrapper = mountEditor(doc)
      await flushPromises()
      await flushPromises()

      const marked = wrapper
        .findAll('.song-chart-chord')
        .filter((c) => c.find('[data-problem]').exists())
        .map((c) => [c.attributes('data-chord'), c.get('[data-problem]').attributes('data-problem')])
      expect(marked).toEqual([
        ['H7', 'not_a_chord'],
        ['C#7', 'not_in_catalog'],
      ])
      const reasons = wrapper.findAll('p[data-lyric-line]').map((p) => p.attributes('data-problem-reason') ?? null)
      expect(reasons).toEqual(['“H7” isn’t a chord', '“C#7” isn’t in the chord catalog', null])
    })

    it('opens the chord popover with [ on a selected word', async () => {
      const wrapper = mountEditor(plainLine)
      await flushPromises()
      await wrapper.get('.ProseMirror').trigger('keydown', { key: 'a', ctrlKey: true })

      await wrapper.get('.ProseMirror').trigger('keydown', { key: '[' })
      await flushPromises()

      expect(wrapper.find('[data-test="chord-popover"]').exists()).toBe(true)
    })

    it('offers Chord only once a word is selected or the cursor is on a chord', async () => {
      const wrapper = mountEditor(plainLine)
      await flushPromises()

      expect(wrapper.get('[data-test="open-chord"]').attributes('disabled')).toBeDefined()
    })

    it("offers the chord's voicings, the best one used until another is picked", async () => {
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Amazing', makeAnchor('a1', 'G')])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()
      await openChord(wrapper)

      const options = wrapper.findAll('[data-test="voicing-option"]')
      expect(options.map((o) => o.attributes('data-voicing-id'))).toEqual(['', ...chordG.voicings.map((v) => v.chord_voicing_id)])
      expect(options[0]!.attributes('aria-checked')).toBe('true')

      await options[2]!.trigger('click')
      await flushPromises()

      expect(emittedChords(wrapper)).toEqual([['G', 'Amazing', gEShape.chord_voicing_id]])
    })

    it('shows each voicing as a chord box, named by where it sits', async () => {
      const doc: SongChartDocument = { type: 'doc', content: [makeSection([makeLyricLine(['Amazing', makeAnchor('a1', 'G')])])] }
      const wrapper = mountEditor(doc)
      await flushPromises()
      await openChord(wrapper)
      await flushPromises()

      const options = wrapper.findAll('[data-test="voicing-option"]').slice(1)
      expect(options.map((o) => o.find('[data-test="chord-box"]').exists())).toEqual([true, true])
      expect(options.map((o) => o.get('[data-test="voicing-name"]').text())).toEqual(['Open', '3fr'])
    })
  })
})
