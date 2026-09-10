import { describe, expect, it } from 'vitest'

import { pathProgress, stepViews } from '@/features/student/utils/pathProgress'
import {
  makeStudentPathItem as item,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

describe('stepViews', () => {
  it('marks the step at current_position as the current one', () => {
    const path = view([
      item(1, undefined, 'completed'),
      item(2, undefined, 'in_progress'),
      item(3, undefined, 'locked'),
    ])

    expect(stepViews(path).map((s) => s.isCurrent)).toEqual([false, true, false])
  })

  it('carries the position, title, status and content node id through unchanged', () => {
    const path = view([item(1, 'Open chords', 'completed'), item(2, undefined, 'not_started')])

    expect(stepViews(path)).toEqual([
      {
        position: 1,
        title: 'Step 1',
        status: 'completed',
        contentNodeId: 'node-1',
        isCurrent: false,
      },
      {
        position: 2,
        title: 'Step 2',
        status: 'not_started',
        contentNodeId: 'node-2',
        isCurrent: true,
      },
    ])
  })

  it('marks the first step current when nothing is done yet', () => {
    const path = view([item(1), item(2), item(3)])

    expect(stepViews(path).map((s) => s.isCurrent)).toEqual([true, false, false])
  })

  it('marks no step current when the whole path is completed', () => {
    const path = view([
      item(1, undefined, 'completed'),
      item(2, undefined, 'completed'),
    ])

    expect(stepViews(path).some((s) => s.isCurrent)).toBe(false)
  })

  it('handles a single-step path', () => {
    const path = view([item(1)])

    expect(stepViews(path)).toHaveLength(1)
    expect(stepViews(path)[0].isCurrent).toBe(true)
  })
})

describe('pathProgress', () => {
  it('counts completed steps against the total', () => {
    const path = view([
      item(1, undefined, 'completed'),
      item(2, undefined, 'in_progress'),
      item(3, undefined, 'locked'),
    ])

    expect(pathProgress(path)).toEqual({ completed: 1, total: 3 })
  })

  it('reports zero complete for a fresh path', () => {
    expect(pathProgress(view([item(1), item(2)]))).toEqual({ completed: 0, total: 2 })
  })

  it('reports every step complete for a finished path', () => {
    const path = view([
      item(1, undefined, 'completed'),
      item(2, undefined, 'completed'),
    ])

    expect(pathProgress(path)).toEqual({ completed: 2, total: 2 })
  })
})
