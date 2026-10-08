import { Editor } from '@tiptap/core'
import { afterEach, describe, expect, it } from 'vitest'

import { songChartExtensions } from '@/features/admin/components/songChartEditor/extensions'
import { toSavedDocument } from '@/features/admin/utils/songChartEditorDocument'
import { makeAnchor, makeLearnerSongChart, makeLyricLine, makeSection } from '@/shared/testUtils/songChart'

import type { components } from '@/api/generated/core-domain'

type SongChartDocument = components['schemas']['SongChartDocument']

let editor: Editor | null = null

function editorWith(doc: SongChartDocument): Editor {
  editor = new Editor({ element: document.createElement('div'), extensions: songChartExtensions(), content: doc })
  return editor
}

afterEach(() => editor?.destroy())

describe('the song chart editor document', () => {
  it('loads a chart document and gives it back unchanged', () => {
    const doc = makeLearnerSongChart().body
    doc.content[0]!.content.unshift({ type: 'comment', content: [{ type: 'text', text: 'Devagar' }] })

    expect(toSavedDocument(editorWith(doc).getJSON())).toEqual(doc)
  })

  it('keeps a picked voicing and a resolved chord on their anchor', () => {
    const doc: SongChartDocument = {
      type: 'doc',
      content: [makeSection([makeLyricLine(['La', makeAnchor('a1', 'G', { chordDefinitionId: 'chord-g', chordVoicingId: 'g-open' })])])],
    }

    expect(toSavedDocument(editorWith(doc).getJSON())).toEqual(doc)
  })

  it('leaves out lines with nothing on them, and sections left empty', () => {
    const doc: SongChartDocument = {
      type: 'doc',
      content: [
        makeSection([makeLyricLine(['La', null])]),
        makeSection([makeLyricLine(['Lo', null])], { kind: 'chorus' }),
      ],
    }
    const e = editorWith(doc)
    e.commands.insertContentAt(e.state.doc.content.size - 1, { type: 'lyricLine' })
    e.commands.insertContentAt(e.state.doc.content.size, { type: 'section', attrs: { kind: 'bridge', label: null }, content: [{ type: 'lyricLine', content: [{ type: 'text', text: '   ' }] }] })

    expect(toSavedDocument(e.getJSON())).toEqual(doc)
  })

  it('gives a copied chord its own anchor id', () => {
    const doc: SongChartDocument = {
      type: 'doc',
      content: [
        makeSection([
          makeLyricLine(['La ', makeAnchor('a1', 'G')]),
          makeLyricLine(['La ', makeAnchor('a1', 'G')]),
        ]),
      ],
    }

    const ids = toSavedDocument(editorWith(doc).getJSON()).content.flatMap((s) =>
      s.content.flatMap((line) => (line.type === 'lyricLine' ? line.content.flatMap((r) => r.marks ?? []) : [])),
    ).map((m) => m.attrs.anchorId)

    expect(new Set(ids).size).toBe(2)
    expect(ids[0]).toBe('a1')
  })

  it('refuses marks on a comment and nodes the chart has no place for', () => {
    const e = editorWith(makeLearnerSongChart().body)

    expect(e.schema.nodes.comment!.spec.marks).toBe('')
    expect(Object.keys(e.schema.nodes).sort()).toEqual(['comment', 'doc', 'lyricLine', 'section', 'text'])
    expect(Object.keys(e.schema.marks)).toEqual(['chordAnchor'])
  })
})
