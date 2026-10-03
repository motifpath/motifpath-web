import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

import { ChordAnchor } from '@/spikes/chord-chart/chordAnchor'

function createEditor(content = 'Amazing grace, how sweet the sound') {
  return new Editor({
    element: document.createElement('div'),
    extensions: [Document, Paragraph, Text, ChordAnchor],
    content: `<p>${content}</p>`,
  })
}

describe('the chart-specific Tiptap chord anchor', () => {
  it('applies a chord to only the selected lyric text using a real Tiptap transaction', () => {
    const editor = createEditor()
    editor.commands.setTextSelection({ from: 1, to: 9 })

    expect(
      editor.commands.setChordAnchor({
        symbol: 'C',
        chordDefinitionId: 'c-major',
        voicingId: 'c-open',
      }),
    ).toBe(true)

    const json = editor.getJSON()
    expect(json.content?.[0]?.content).toEqual([
      {
        type: 'text',
        text: 'Amazing ',
        marks: [
          {
            type: 'chordAnchor',
            attrs: { symbol: 'C', chordDefinitionId: 'c-major', voicingId: 'c-open' },
          },
        ],
      },
      { type: 'text', text: 'grace, how sweet the sound' },
    ])
    expect(editor.getHTML()).toContain('data-chord-symbol="C"')
    expect(editor.getHTML()).toContain('Amazing ')
    editor.destroy()
  })

  it('round-trips alternate voicing metadata through Tiptap JSON without changing the lyric', () => {
    const editor = createEditor('stay with me')
    editor.commands.setTextSelection({ from: 1, to: 5 })
    editor.commands.setChordAnchor({
      symbol: 'C',
      chordDefinitionId: 'c-major',
      voicingId: 'c-barre-3',
    })

    const saved = editor.getJSON()
    editor.commands.setContent(saved)

    expect(editor.getText()).toBe('stay with me')
    expect(editor.getJSON().content?.[0]?.content?.[0]?.marks?.[0]?.attrs).toEqual({
      symbol: 'C',
      chordDefinitionId: 'c-major',
      voicingId: 'c-barre-3',
    })
    editor.destroy()
  })

  it('removes the anchor without deleting or rewriting lyric text', () => {
    const editor = createEditor('C a melody')
    editor.commands.setTextSelection({ from: 1, to: 2 })
    editor.commands.setChordAnchor({ symbol: 'C' })
    editor.commands.unsetChordAnchor()

    expect(editor.getText()).toBe('C a melody')
    expect(editor.getJSON()).not.toMatchObject({ marks: [{ type: 'chordAnchor' }] })
    editor.destroy()
  })

  it('does not extend the chord anchor when typing after the selected lyric', () => {
    const editor = createEditor('grace')
    editor.commands.setTextSelection({ from: 1, to: 6 })
    editor.commands.setChordAnchor({ symbol: 'C' })
    editor.commands.setTextSelection({ from: 6, to: 6 })
    editor.commands.insertContent('!')

    expect(editor.getJSON().content?.[0]?.content).toEqual([
      {
        type: 'text',
        text: 'grace',
        marks: [
          { type: 'chordAnchor', attrs: { symbol: 'C', chordDefinitionId: null, voicingId: null } },
        ],
      },
      { type: 'text', text: '!' },
    ])
    editor.destroy()
  })

  it('is isolated from the generic prompt mark vocabulary', () => {
    const editor = createEditor('lyric')

    expect(editor.schema.marks.chordAnchor).toBeDefined()
    expect(editor.schema.marks.bold).toBeUndefined()
    editor.destroy()
  })
})
