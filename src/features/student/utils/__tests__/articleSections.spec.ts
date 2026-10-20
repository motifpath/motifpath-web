import { describe, expect, it } from 'vitest'

import { articleSections } from '@/features/student/utils/articleSections'
import { makeParagraphCue, makeTimedCue } from '@/features/student/testing/expandedContent'
import type { components } from '@/api/generated/core-domain'

type PromptDocument = components['schemas']['PromptDocument']
type PromptNode = components['schemas']['PromptNode']

function paragraph(text: string): PromptNode {
  return { type: 'paragraph', content: [{ type: 'text', text }] }
}

function heading(text: string): PromptNode {
  return { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] }
}

const diagram: PromptNode = { type: 'diagram', attrs: {} }

function doc(...content: PromptNode[]): PromptDocument {
  return { type: 'doc', content }
}

/** Each section as the texts of its blocks and the ids of the cues under it. */
function shape(sections: ReturnType<typeof articleSections>) {
  return sections.map((section) => ({
    blocks: section.document.content.map((node) => node.content?.[0]?.text ?? node.type),
    cues: section.cues.map((cue) => cue.expanded_content_id),
  }))
}

describe('articleSections', () => {
  it('keeps an article without cues in one piece', () => {
    const body = doc(paragraph('One'), paragraph('Two'))

    expect(shape(articleSections(body, []))).toEqual([{ blocks: ['One', 'Two'], cues: [] }])
  })

  it('puts a cue right after its paragraph, and the rest of the text after the cue', () => {
    const body = doc(paragraph('One'), paragraph('Two'), paragraph('Three'))

    expect(shape(articleSections(body, [makeParagraphCue('picture', 2)]))).toEqual([
      { blocks: ['One', 'Two'], cues: ['picture'] },
      { blocks: ['Three'], cues: [] },
    ])
  })

  it('counts only paragraphs, not headings or embedded diagrams', () => {
    const body = doc(heading('Title'), diagram, paragraph('One'), heading('Next'), paragraph('Two'), paragraph('Three'))

    expect(shape(articleSections(body, [makeParagraphCue('picture', 2)]))).toEqual([
      { blocks: ['Title', 'diagram', 'One', 'Next', 'Two'], cues: ['picture'] },
      { blocks: ['Three'], cues: [] },
    ])
  })

  it('shows cues on the same paragraph together, in the order they are listed', () => {
    const body = doc(paragraph('One'), paragraph('Two'))

    expect(shape(articleSections(body, [makeParagraphCue('b', 1), makeParagraphCue('a', 1)]))).toEqual([
      { blocks: ['One'], cues: ['b', 'a'] },
      { blocks: ['Two'], cues: [] },
    ])
  })

  it('orders cues by their paragraph, whatever order they are listed in', () => {
    const body = doc(paragraph('One'), paragraph('Two'), paragraph('Three'))

    expect(shape(articleSections(body, [makeParagraphCue('late', 3), makeParagraphCue('early', 1)]))).toEqual([
      { blocks: ['One'], cues: ['early'] },
      { blocks: ['Two', 'Three'], cues: ['late'] },
    ])
  })

  it('keeps a cue past the last paragraph at the end of the text rather than dropping it', () => {
    const body = doc(paragraph('One'), paragraph('Two'))

    expect(shape(articleSections(body, [makeParagraphCue('beyond', 7)]))).toEqual([
      { blocks: ['One', 'Two'], cues: ['beyond'] },
    ])
  })

  it('leaves out cues timed to a video', () => {
    const body = doc(paragraph('One'))

    expect(shape(articleSections(body, [makeTimedCue('timed', 0, 5)]))).toEqual([{ blocks: ['One'], cues: [] }])
  })

  it('does not change the article or the cue list', () => {
    const body = doc(paragraph('One'), paragraph('Two'))
    const cues = [makeParagraphCue('late', 2), makeParagraphCue('early', 1)]
    const before = JSON.stringify({ body, cues })

    articleSections(body, cues)

    expect(JSON.stringify({ body, cues })).toBe(before)
  })
})
