import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']
type PromptDocument = components['schemas']['PromptDocument']

/** A run of an article's text and the cues shown right after it. */
export interface ArticleSection {
  document: PromptDocument
  cues: ExpandedContent[]
}

/**
 * Splits an article at the paragraphs its cues sit under, so each cue shows right after its
 * paragraph and stays there. A cue's paragraph counts the article's top-level paragraphs from 1;
 * headings, lists and embedded diagrams are not paragraphs. A cue past the last paragraph shows at
 * the end of the text rather than not at all, and a cue timed to a video has no place here.
 * Neither the article nor the cue list is changed.
 */
export function articleSections(document: PromptDocument, cues: ExpandedContent[]): ArticleSection[] {
  const cuesByParagraph = new Map<number, ExpandedContent[]>()
  for (const cue of cues) {
    const paragraph = cue.trigger_at_paragraph
    if (paragraph === undefined) continue
    cuesByParagraph.set(paragraph, [...(cuesByParagraph.get(paragraph) ?? []), cue])
  }

  const sections: ArticleSection[] = []
  let blocks: PromptDocument['content'] = []
  let paragraph = 0
  for (const node of document.content) {
    blocks.push(node)
    if (node.type !== 'paragraph') continue
    paragraph += 1
    const here = cuesByParagraph.get(paragraph)
    if (!here) continue
    cuesByParagraph.delete(paragraph)
    sections.push({ document: { type: 'doc', content: blocks }, cues: here })
    blocks = []
  }

  const beyond = [...cuesByParagraph.entries()].sort(([a], [b]) => a - b).flatMap(([, rest]) => rest)
  if (blocks.length > 0 || beyond.length > 0 || sections.length === 0) {
    sections.push({ document: { type: 'doc', content: blocks }, cues: beyond })
  }
  return sections
}
