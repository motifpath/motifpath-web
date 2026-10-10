import { describe, expect, it } from 'vitest'

import { pathProgress } from '@/features/student/utils/pathProgress'
import {
  makeStudentPathItem as item,
  makeStudentPathView as view,
} from '@/features/student/testing/studentPathItem'

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
