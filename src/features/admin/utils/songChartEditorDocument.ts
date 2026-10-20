import type { JSONContent } from '@tiptap/core'

import type { components } from '@/api/generated/core-domain'
import { SECTION_KINDS } from '@/features/admin/components/songChartEditor/extensions'

type SongChartDocument = components['schemas']['SongChartDocument']
type Section = components['schemas']['SongChartSection']
type SectionKind = Section['attrs']['kind']
type Line = Section['content'][number]
type Run = components['schemas']['SongChartText']
type Anchor = components['schemas']['SongChartChordAnchor']['attrs']

function text(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function isSectionKind(value: unknown): value is SectionKind {
  return SECTION_KINDS.some((kind) => kind === value)
}

/**
 * The editor's content as a chart document to save: lines with nothing on them and sections
 * left empty are dropped, since a chart holds neither, and a chord copied with its anchor id
 * gets an id of its own.
 */
export function toSavedDocument(json: JSONContent): SongChartDocument {
  const usedIds = new Set<string>()
  let next = 1
  function anchorId(id: string | null): string {
    if (id && !usedIds.has(id)) {
      usedIds.add(id)
      return id
    }
    while (usedIds.has(`a${next}`)) next++
    const fresh = `a${next}`
    usedIds.add(fresh)
    return fresh
  }

  function anchorOf(node: JSONContent): Anchor | null {
    const mark = node.marks?.find((m) => m.type === 'chordAnchor')
    const symbol = text(mark?.attrs?.writtenSymbol)
    if (!mark || !symbol) return null
    return {
      anchorId: anchorId(text(mark.attrs?.anchorId)),
      writtenSymbol: symbol,
      chordDefinitionId: text(mark.attrs?.chordDefinitionId),
      chordVoicingId: text(mark.attrs?.chordVoicingId),
    }
  }

  function lineOf(node: JSONContent): Line | null {
    const pieces = (node.content ?? []).filter((t) => t.type === 'text' && t.text)
    if (node.type === 'comment') {
      const comment = pieces.map((t) => t.text ?? '').join('')
      return comment.trim() ? { type: 'comment', content: [{ type: 'text', text: comment }] } : null
    }
    if (node.type !== 'lyricLine') return null
    const runs: Run[] = pieces.map((t) => {
      const anchor = anchorOf(t)
      return anchor ? { type: 'text', text: t.text ?? '', marks: [{ type: 'chordAnchor', attrs: anchor }] } : { type: 'text', text: t.text ?? '' }
    })
    const hasChord = runs.some((r) => r.marks)
    return hasChord || runs.some((r) => r.text.trim()) ? { type: 'lyricLine', content: runs } : null
  }

  const sections: Section[] = []
  for (const node of json.content ?? []) {
    if (node.type !== 'section') continue
    const lines = (node.content ?? []).map(lineOf).filter((l): l is Line => l !== null)
    if (lines.length === 0) continue
    const kind = node.attrs?.kind
    sections.push({
      type: 'section',
      attrs: { kind: isSectionKind(kind) ? kind : 'other', label: text(node.attrs?.label) },
      content: lines,
    })
  }
  return { type: 'doc', content: sections }
}
