import { Extension, Mark, Node } from '@tiptap/core'
import type { Extensions } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import History from '@tiptap/extension-history'
import Text from '@tiptap/extension-text'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

/** The kinds of part a song has. */
export const SECTION_KINDS = ['verse', 'chorus', 'bridge', 'intro', 'outro', 'instrumental', 'other'] as const

/** A song chart is sections, and nothing else, at its top level. */
const SongChartDoc = Document.extend({ content: 'section+' })

/** A section's tags read back from pasted HTML: only strings are kept, and anything unreadable is none. */
function progressionKeysOf(value: string | null): string[] {
  if (!value) return []
  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : []
  } catch {
    return []
  }
}

/**
 * A part of the song, with its kind, an optional label and the progressions it's tagged with,
 * holding lyric lines and comments. The tags travel with a section that is cut or copied, since
 * the editor's clipboard goes through HTML.
 */
const Section = Node.create({
  name: 'section',
  content: '(lyricLine | comment)+',
  defining: true,
  addAttributes() {
    return {
      kind: { default: 'verse', parseHTML: (el: HTMLElement) => el.getAttribute('data-kind'), renderHTML: (a: { kind: string }) => ({ 'data-kind': a.kind }) },
      label: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute('data-label'), renderHTML: (a: { label: string | null }) => (a.label ? { 'data-label': a.label } : {}) },
      progression_keys: {
        default: [],
        parseHTML: (el: HTMLElement) => progressionKeysOf(el.getAttribute('data-progression-keys')),
        renderHTML: (a: { progression_keys: string[] }) =>
          a.progression_keys.length ? { 'data-progression-keys': JSON.stringify(a.progression_keys) } : {},
      },
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

/** A chord written in the lyrics that stops the chart from being published. */
export type ChordProblem = 'not_a_chord' | 'not_in_catalog'

export interface ChordProblemsOptions {
  /** What is wrong with a written symbol; null when nothing is, or nothing is known yet. */
  problemOf: (symbol: string) => ChordProblem | null
  /** The sentence shown under a line for one of its chords' problems. */
  reasonOf: (symbol: string, problem: ChordProblem) => string
}

/** Dispatched with this key when the answers about chords change, so the marks are drawn again. */
export const chordProblemsKey = new PluginKey<DecorationSet>('chordProblems')

/**
 * Marks each chord that stops publishing where it is written (`data-problem` on the chord), and
 * puts the first one's reason under its line (`data-problem-reason` on the line), so an author
 * sees what to fix without leaving the lyrics.
 */
export const ChordProblems = Extension.create<ChordProblemsOptions>({
  name: 'chordProblems',
  addOptions() {
    return { problemOf: () => null, reasonOf: (symbol) => symbol }
  },
  addProseMirrorPlugins() {
    const { problemOf, reasonOf } = this.options
    function decorate(state: EditorState): DecorationSet {
      const decorations: Decoration[] = []
      state.doc.descendants((node, pos) => {
        if (node.type.name !== 'lyricLine') return node.type.name !== 'comment'
        let reason: string | null = null
        node.forEach((child, offset) => {
          const mark = child.marks.find((m) => m.type.name === 'chordAnchor')
          const symbol = typeof mark?.attrs.writtenSymbol === 'string' ? mark.attrs.writtenSymbol : null
          const problem = symbol ? problemOf(symbol) : null
          if (!symbol || !problem) return
          const from = pos + 1 + offset
          decorations.push(Decoration.inline(from, from + child.nodeSize, { 'data-problem': problem }))
          reason ??= reasonOf(symbol, problem)
        })
        if (reason) decorations.push(Decoration.node(pos, pos + node.nodeSize, { 'data-problem-reason': reason }))
        return false
      })
      return DecorationSet.create(state.doc, decorations)
    }
    return [
      new Plugin({
        key: chordProblemsKey,
        state: {
          init: (_, state) => decorate(state),
          apply: (tr, old, _, state) => (tr.docChanged || tr.getMeta(chordProblemsKey) ? decorate(state) : old),
        },
        props: { decorations: (state) => chordProblemsKey.getState(state) },
      }),
    ]
  },
})

/** Everything the song chart editor's schema holds, and undo; chord problems marked as `chordProblems` says. */
export function songChartExtensions(chordProblems?: Partial<ChordProblemsOptions>): Extensions {
  return [SongChartDoc, Section, LyricLine, Comment, Text, ChordAnchor, History, ChordProblems.configure(chordProblems ?? {})]
}
