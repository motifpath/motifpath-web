import { beforeEach, describe, expect, it } from 'vitest'

import {
  restoreCourseCatalogReturn,
  saveCourseCatalogReturn,
} from '@/features/student/utils/courseCatalogReturn'

describe('course catalog return state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores a matching course journey once, including its filters and scroll position', () => {
    saveCourseCatalogReturn({
      courseId: 'c-1',
      filters: {
        levels: ['beginner'],
        skillIds: ['skill-1'],
        conceptIds: [],
        teacher: { user_id: 'teacher-1', display_name: 'Bob Martins' },
        instrumentId: 'instrument-1',
        language: null,
      },
      searchText: 'fingerstyle',
      loadedCount: 40,
      scrollY: 640,
    })

    expect(restoreCourseCatalogReturn('c-2')).toBeNull()
    expect(restoreCourseCatalogReturn('c-1')).toEqual({
      filters: {
        levels: ['beginner'],
        skillIds: ['skill-1'],
        conceptIds: [],
        teacher: { user_id: 'teacher-1', display_name: 'Bob Martins' },
        instrumentId: 'instrument-1',
        language: null,
      },
      searchText: 'fingerstyle',
      loadedCount: 40,
      scrollY: 640,
    })
    expect(restoreCourseCatalogReturn('c-1')).toBeNull()
  })
})
