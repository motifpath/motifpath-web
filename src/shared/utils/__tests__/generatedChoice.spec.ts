import { describe, expect, it } from 'vitest'

import { gradeGeneratedChoice, rightAnswerOf } from '@/shared/utils/generatedChoice'
import { isGeneratedWay } from '@/shared/utils/generatedChoice'
import type { GeneratedQuestion } from '@/shared/utils/generatedChoice'
import golden from '@/api/generated/golden/practice-graders/generated_choice.v1.json'

const catalog: Record<string, { bars: string[] }> = golden.reference.progressions

describe('gradeGeneratedChoice', () => {
  const vi: GeneratedQuestion = { way: 'numeral_to_chord', key: 'G', numeral: 'vi' }

  it('reads a root in either spelling', () => {
    expect(gradeGeneratedChoice({ way: 'numeral_to_chord', key: 'Db', numeral: 'IV' }, catalog, { options: ['Gb', 'Ab', 'Ebm', 'Bbm'], choice: 'Gb' })).toBe(true)
  })

  it('is no answer when the pick isn’t one of the options as shown', () => {
    expect(gradeGeneratedChoice(vi, catalog, { options: ['Em', 'C', 'Am', 'Bm'], choice: 'em' })).toBeNull()
  })

  it('names the right answer as the catalog spells it', () => {
    expect(rightAnswerOf({ way: 'numeral_to_chord', key: 'Db', numeral: 'IV' }, catalog)).toBe('F#')
  })
})

// The server grades the same answers; these shared cases keep the feedback a student sees in
// agreement with what's recorded. Only invalid choices are a client's concern: the other
// rejections are about the item or the response's shape, which a client never gets wrong for a
// question it was given.
describe('gradeGeneratedChoice against the generated_choice.v1 golden cases', () => {
  const KEYED_BY_THE_ITEM = ['diatonic_chord', 'chord_function']

  function questionOf(itemKey: string, way: string, musicKey: string | undefined): GeneratedQuestion | null {
    const [kind = '', first = '', second = ''] = itemKey.split(':')
    if (!isGeneratedWay(way)) return null
    if (KEYED_BY_THE_ITEM.includes(kind)) return { way, key: first, numeral: second }
    if (!musicKey) return null
    if (kind === 'heard_chord') return { way, key: musicKey, numeral: first }
    return catalog[first] ? { way, key: musicKey, progression: first } : null
  }

  interface Case {
    name: string
    question: GeneratedQuestion
    answer: { options: string[]; choice: string }
    correct: boolean | null
    revealed: string | undefined
  }

  const cases = golden.cases.flatMap(({ name, item_key, response, expected }): Case[] => {
    if (response.response_type !== 'generated_choice' || !('way' in response) || !response.options || response.choice === undefined) return []
    const question = questionOf(item_key, response.way, 'music_key' in response ? response.music_key : undefined)
    if (!question) return []
    const answer = { options: response.options, choice: response.choice }
    if ('evidence' in expected && expected.evidence) {
      const correct: boolean | null = expected.evidence.correct
      return [{ name, question, answer, correct, revealed: expected.evidence.answer_key.answer }]
    }
    if ('reason' in expected && expected.reason === 'invalid_choices') return [{ name, question, answer, correct: null, revealed: undefined }]
    return []
  })

  it('knows every way the golden cases ask', () => {
    const ways = golden.cases.flatMap(({ response }) => ('way' in response && typeof response.way === 'string' ? [response.way] : []))
    expect(ways.filter((way) => !isGeneratedWay(way))).toEqual([])
  })

  it('has cases to run, right, wrong and refused', () => {
    expect(cases.some((c) => c.correct === true)).toBe(true)
    expect(cases.some((c) => c.correct === false)).toBe(true)
    expect(cases.some((c) => c.correct === null)).toBe(true)
  })

  it.each(cases)('$name', ({ question, answer, correct }) => {
    expect(gradeGeneratedChoice(question, catalog, answer)).toBe(correct)
  })

  // A wrong pick reveals the right answer: the one the server's answer key names.
  it.each(cases.filter((c) => c.revealed !== undefined))('reveals the answer key’s answer: $name', ({ question, revealed }) => {
    expect(rightAnswerOf(question, catalog)).toBe(revealed)
  })
})
