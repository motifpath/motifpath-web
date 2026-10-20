import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { findSubject, pathSubjects, searchSubjects } from '@/features/student/utils/practiceSubjects'

type Subject = components['schemas']['PracticeSubject']
type SubjectList = components['schemas']['PracticeSubjectList']

function subject(id: string, en: string, fields: Partial<Subject> = {}): Subject {
  return { node_id: id, names: { en }, on_path: false, item_count: 4, level: 'new', current_rung: 'know', ...fields }
}

const list: SubjectList = {
  instrument_id: null,
  groups: [
    {
      area_node_id: 'harmony',
      names: { en: 'Harmony' },
      subjects: [subject('diatonic', 'Diatonic chords', { on_path: true }), subject('function', 'Chord function')],
    },
    {
      area_node_id: 'ear',
      names: { en: 'Ear' },
      subjects: [subject('intervals', 'Recognise intervals'), subject('progressions', 'Hear progressions', { on_path: true })],
    },
  ],
}

const nameOf = (s: Subject) => s.names.en

describe('pathSubjects', () => {
  it("lists the student's path subjects across areas, in the list's order", () => {
    expect(pathSubjects(list).map((s) => s.node_id)).toEqual(['diatonic', 'progressions'])
  })
})

describe('findSubject', () => {
  it('finds a subject in any area', () => {
    expect(findSubject(list, 'intervals')?.names.en).toBe('Recognise intervals')
  })

  it('is null for a node the list does not offer', () => {
    expect(findSubject(list, 'missing')).toBeNull()
  })
})

describe('searchSubjects', () => {
  it('finds subjects whose name holds every word typed, in any case', () => {
    expect(searchSubjects(list, 'CHORD', nameOf).map((s) => s.node_id)).toEqual(['diatonic', 'function'])
    expect(searchSubjects(list, 'chords diat', nameOf).map((s) => s.node_id)).toEqual(['diatonic'])
  })

  it('ignores accents, so "acorde" finds "Acórdes"', () => {
    const pt: SubjectList = { instrument_id: null, groups: [{ area_node_id: 'h', names: { en: 'H' }, subjects: [subject('a', 'Acórdes diatônicos')] }] }

    expect(searchSubjects(pt, 'acorde diaton', nameOf).map((s) => s.node_id)).toEqual(['a'])
  })

  it('finds nothing for blank text', () => {
    expect(searchSubjects(list, '   ', nameOf)).toEqual([])
  })
})
