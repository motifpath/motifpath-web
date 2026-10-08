import { Mark, Node } from '@tiptap/core'
import type { Extensions } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Text from '@tiptap/extension-text'

/** The kinds of part a song has. */
export const SECTION_KINDS = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'instrumental', 'other'] as const

/** A song chart is sections, and nothing else, at its top level. */
const SongChartDoc = Document.extend({ content: 'section+' })

/** A part of the song, with its kind and an optional label, holding lyric lines and comments. */
const Section = Node.create({
  name: 'section',
  content: '(lyricLine | comment)+',
  defining: true,
  addAttributes() {
    return {
      kind: { default: 'verse', parseHTML: (el: HTMLElement) => el.getAttribute('data-kind'), renderHTML: (a: { kind: string }) => ({ 'data-kind': a.kind }) },
      label: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-label'), renderHTML: (a: { label: string | null }) => (a.label ? { 'data-label': a.label } : {}) },
    }
  },
  parseHTML: () => [{ tag: 'section[data-kind]' }],
  renderHTML: ({ HTMLAttributes }) => ['section', HTMLAttributes, 0],
})

/** A line of lyrics; chords sit on its words. */
const LyricLine = Node.create({
  name: 'lyricLine',
  content: 'text*',
  marks: 'chordAnchor',
  parseHTML: () => [{ tag: 'p[data-lyric-line]' }],
  renderHTML: () => ['p', { 'data-lyric-line': '' }, 0],
})

/** A performance note between lines; it carries no chords. */
const Comment = Node.create({
  name: 'comment',
  content: 'text*',
  marks: '',
  parseHTML: () => [{ tag: 'p[data-comment]' }],
  renderHTML: () => ['p', { 'data-comment': '', class: 'song-chart-comment' }, 0],
})

/**
 * A chord on a word or syllable: the symbol as the author wrote it, the catalog chord it
 * resolves to and the voicing the author picked (both set or cleared by the server and the
 * voicing picker). Typing next to a chord never extends it.
 */
export const ChordAnchor = Mark.create({
  name: 'chordAnchor',
  inclusive: false,
  addAttributes() {
    const attr = (name: string, html: string) => ({
      default: null,
      parseHTML: (el: HTMLElement) => el.getAttribute(html),
      renderHTML: (a: Record<string, string | null>) => (a[name] ? { [html]: a[name] } : {}),
    })
    return {
      anchorId: attr('anchorId', 'data-anchor-id'),
      writtenSymbol: attr('writtenSymbol', 'data-chord'),
      chordDefinitionId: attr('chordDefinitionId', 'data-chord-definition-id'),
      chordVoicingId: attr('chordVoicingId', 'data-chord-voicing-id'),
    }
  },
  parseHTML: () => [{ tag: 'span[data-chord]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', { ...HTMLAttributes, class: 'song-chart-chord' }, 0],
})

/** Everything the song chart editor's schema holds, and undo. */
export function songChartExtensions(): Extensions {
  return [SongChartDoc, Section, LyricLine, Comment, Text, ChordAnchor, History]
}
