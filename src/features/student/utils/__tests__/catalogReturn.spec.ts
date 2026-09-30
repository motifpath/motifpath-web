import { beforeEach, describe, expect, it } from 'vitest'

import { restoreCatalogReturn, saveCatalogReturn } from '@/features/student/utils/catalogReturn'

const filters = {
  levels: ['beginner' as const],
  skillIds: ['skill-1'],
  conceptIds: [],
  teacher: { user_id: 'teacher-1', display_name: 'Bob Martins' },
  instrumentId: 'instrument-1',
  language: null,
}

describe('catalog return state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores a matching journey once, including its filters and scroll position', () => {
    saveCatalogReturn('courses', { itemId: 'c-1', filters, searchText: 'fingerstyle', loadedCount: 40, scrollY: 640 })

    expect(restoreCatalogReturn('courses', 'c-2')).toBeNull()
    expect(restoreCatalogReturn('courses', 'c-1')).toEqual({
      filters,
      searchText: 'fingerstyle',
      loadedCount: 40,
      scrollY: 640,
    })
    expect(restoreCatalogReturn('courses', 'c-1')).toBeNull()
  })

  it('keeps each catalog journey apart', () => {
    saveCatalogReturn('courses', { itemId: 'same-id', filters, searchText: 'course search', loadedCount: 20, scrollY: 100 })
    saveCatalogReturn('paths', { itemId: 'same-id', filters, searchText: 'path search', loadedCount: 10, scrollY: 50 })

    expect(restoreCatalogReturn('paths', 'same-id')?.searchText).toBe('path search')
    expect(restoreCatalogReturn('courses', 'same-id')?.searchText).toBe('course search')
  })

})
