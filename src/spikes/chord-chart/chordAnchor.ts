import { Mark, mergeAttributes } from '@tiptap/core'

export type ChordAnchorAttributes = {
  symbol: string | null
  chordDefinitionId: string | null
  voicingId: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chordAnchor: {
      setChordAnchor: (attributes: Partial<ChordAnchorAttributes>) => ReturnType
      unsetChordAnchor: () => ReturnType
    }
  }
}

export const ChordAnchor = Mark.create({
  name: 'chordAnchor',
  inclusive: false,

  addAttributes() {
    return {
      symbol: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chord-symbol'),
        renderHTML: (attributes: ChordAnchorAttributes) => ({
          'data-chord-symbol': attributes.symbol,
        }),
      },
      chordDefinitionId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-chord-definition-id'),
        renderHTML: (attributes: ChordAnchorAttributes) => ({
          'data-chord-definition-id': attributes.chordDefinitionId,
        }),
      },
      voicingId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-voicing-id'),
        renderHTML: (attributes: ChordAnchorAttributes) => ({
          'data-voicing-id': attributes.voicingId,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-chord-symbol]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'chord-anchor' }), 0]
  },

  addCommands() {
    return {
      setChordAnchor:
        (attributes: Partial<ChordAnchorAttributes>) =>
        ({ commands }) =>
          commands.setMark(this.name, attributes),
      unsetChordAnchor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    }
  },
})
