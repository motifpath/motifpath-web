import { describe, expect, it } from 'vitest'

import { canEditDiagram } from '@/shared/utils/diagramOwnership'

const teacher = { user_id: 'u-teacher', role: 'teacher' as const }
const otherTeacher = { user_id: 'u-other', role: 'teacher' as const }
const admin = { user_id: 'u-admin', role: 'admin' as const }
const student = { user_id: 'u-student', role: 'student' as const }

const basic = { kind: 'basic' as const, created_by: { user_id: 'u-admin', display_name: 'Marina Alves' } }
const teachersOwn = { kind: 'custom' as const, created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } }

describe('canEditDiagram', () => {
  it('lets a teacher save over their own custom diagram', () => {
    expect(canEditDiagram(teachersOwn, teacher)).toBe(true)
  })

  it("does not let a teacher save over another teacher's custom diagram", () => {
    expect(canEditDiagram(teachersOwn, otherTeacher)).toBe(false)
  })

  it('decides ownership by user id, never by display name', () => {
    const namesake = { kind: 'custom' as const, created_by: { user_id: 'u-other', display_name: 'Bob Ferreira' } }
    expect(canEditDiagram(namesake, teacher)).toBe(false)
  })

  it('does not let a teacher save over a basic template, even one they somehow own', () => {
    expect(canEditDiagram(basic, teacher)).toBe(false)
    expect(canEditDiagram({ kind: 'basic', created_by: { user_id: 'u-teacher', display_name: 'Bob Ferreira' } }, teacher)).toBe(false)
  })

  it('lets an admin save over any diagram', () => {
    expect(canEditDiagram(basic, admin)).toBe(true)
    expect(canEditDiagram(teachersOwn, admin)).toBe(true)
  })

  it('never lets a student, or an unknown user, save a diagram', () => {
    expect(canEditDiagram(teachersOwn, student)).toBe(false)
    expect(canEditDiagram(teachersOwn, null)).toBe(false)
  })
})
