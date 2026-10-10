import { describe, expect, it } from 'vitest'

import { buildMyPath, stepAfter } from '@/features/student/utils/myPath'
import {
  makeStudentPathItem as item,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

const english = { code: 'en', name: 'English' }

function languageLocked(position: number, sectionLabel?: string) {
  return { ...item(position, sectionLabel, 'locked'), lock_reason: 'language' as const, available_languages: [english] }
}

function behindEarlierStep(position: number, sectionLabel?: string) {
  return { ...item(position, sectionLabel, 'locked'), lock_reason: 'previous_step' as const }
}

describe('buildMyPath', () => {
  it('names the step at current_position as the next step', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), item(2), behindEarlierStep(3)]))

    expect(path.next?.position).toBe(2)
    expect(path.next?.state).toBe('current')
  })

  it('gives each step its state: done, current, locked behind an earlier step', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), item(2, undefined, 'in_progress'), behindEarlierStep(3)]))

    expect(path.sections[0].steps.map((s) => s.state)).toEqual(['done', 'current', 'locked'])
  })

  it('marks a language-locked step with its own state and the languages it can be opened in', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), languageLocked(2), behindEarlierStep(3)]))

    const step = path.sections[0].steps[1]
    expect(step.state).toBe('language')
    expect(step.availableLanguages).toEqual(['en'])
  })

  it('keeps a language-locked step at current_position as the next step: it is the way forward', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), languageLocked(2)]))

    expect(path.next?.position).toBe(2)
    expect(path.next?.state).toBe('language')
  })

  it('treats a locked step without a reason as locked behind an earlier step', () => {
    const path = buildMyPath(view([item(1), item(2, undefined, 'locked')]))

    expect(path.sections[0].steps[1].state).toBe('locked')
  })

  it('shows a step that is open but not the next one as open', () => {
    const path = buildMyPath(view([item(1), item(2)], { current_position: 1 }))

    expect(path.sections[0].steps.map((s) => s.state)).toEqual(['current', 'open'])
  })

  it('carries the kind of each step', () => {
    const path = buildMyPath(view([{ ...item(1), content_type: 'article' }, item(2)]))

    expect(path.sections[0].steps.map((s) => s.kind)).toEqual(['article', 'video'])
  })

  it('groups steps into sections by label, counting the done steps in each', () => {
    const path = buildMyPath(
      view([item(1, 'Open chords', 'completed'), item(2, 'Open chords', 'completed'), item(3, 'Changes'), behindEarlierStep(4, 'Changes')]),
    )

    expect(path.sections.map(({ label, done, total }) => ({ label, done, total }))).toEqual([
      { label: 'Open chords', done: 2, total: 2 },
      { label: 'Changes', done: 0, total: 2 },
    ])
  })

  it('folds a section whose steps are all done, and leaves the current and later sections open', () => {
    const path = buildMyPath(
      view([item(1, 'Open chords', 'completed'), item(2, 'Changes'), behindEarlierStep(3, 'Strumming')]),
    )

    expect(path.sections.map((s) => s.finished)).toEqual([true, false, false])
  })

  it('never folds an unlabelled run, which has no row to fold into', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), item(2, 'Changes')]))

    expect(path.sections[0].finished).toBe(false)
  })

  it('counts progress as done steps out of all steps', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), item(2), behindEarlierStep(3)]))

    expect(path.progress).toEqual({ completed: 1, total: 3 })
  })

  it('has no next step and is complete once every step is done', () => {
    const path = buildMyPath(view([item(1, undefined, 'completed'), item(2, undefined, 'completed')], { current_position: 2 }))

    expect(path.next).toBeNull()
    expect(path.complete).toBe(true)
  })

  it('is not complete while a step is left', () => {
    expect(buildMyPath(view([item(1, undefined, 'completed'), item(2)])).complete).toBe(false)
  })
})

describe('stepAfter', () => {
  it('gives the step after a step, as the path has it now', () => {
    const path = view([item(1, undefined, 'completed'), item(2, undefined, 'completed'), languageLocked(3)])

    expect(stepAfter(path, 'node-2')).toMatchObject({ position: 3, contentNodeId: 'node-3', state: 'language', availableLanguages: ['en'] })
  })

  it('has nothing after the last step', () => {
    expect(stepAfter(view([item(1, undefined, 'completed'), item(2)]), 'node-2')).toBeNull()
  })

  it('has nothing after a step that is not on the path', () => {
    expect(stepAfter(view([item(1), item(2)]), 'node-9')).toBeNull()
  })
})
