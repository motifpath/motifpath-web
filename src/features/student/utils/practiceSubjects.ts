import type { components } from '@/api/generated/core-domain'

type Subject = components['schemas']['PracticeSubject']
type SubjectList = components['schemas']['PracticeSubjectList']

function allSubjects(list: SubjectList): Subject[] {
  return list.groups.flatMap((group) => group.subjects)
}

/** The student's path subjects, across areas, in the list's order. */
export function pathSubjects(list: SubjectList): Subject[] {
  return allSubjects(list).filter((subject) => subject.on_path)
}

/** The subject of a node the list offers, or null when it offers none for that node. */
export function findSubject(list: SubjectList, nodeId: string): Subject | null {
  return allSubjects(list).find((subject) => subject.node_id === nodeId) ?? null
}

/** Lower case with accents taken off, so "Acórde" and "acorde" read alike. */
function folded(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}

/** The subjects whose name, as shown, holds every word typed, ignoring case and accents. Blank text finds nothing. */
export function searchSubjects(list: SubjectList, text: string, nameOf: (subject: Subject) => string): Subject[] {
  const words = folded(text).split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return allSubjects(list).filter((subject) => {
    const name = folded(nameOf(subject))
    return words.every((word) => name.includes(word))
  })
}
