import { beforeEach, describe, expect, it } from 'vitest'

import { catalogReturnQuery, restoreCatalogReturn, saveCatalogReturn } from '@/features/student/utils/catalogReturn'

const query = { q: 'fingerstyle', level: ['beginner'], teacher: 'teacher-1' }

describe('catalog return state', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores a matching journey’s place once', () => {
    saveCatalogReturn('courses', { itemId: 'c-1', query, loadedCount: 40, scrollY: 640 })

    expect(restoreCatalogReturn('courses', 'c-2')).toBeNull()
    expect(restoreCatalogReturn('courses', 'c-1')).toEqual({ loadedCount: 40, scrollY: 640 })
    expect(restoreCatalogReturn('courses', 'c-1')).toBeNull()
  })

  it('gives the detail the Discover address it was opened from, without using up the journey', () => {
    saveCatalogReturn('courses', { itemId: 'c-1', query, loadedCount: 40, scrollY: 640 })

    expect(catalogReturnQuery('courses', 'c-2')).toBeNull()
    expect(catalogReturnQuery('courses', 'c-1')).toEqual(query)
    expect(restoreCatalogReturn('courses', 'c-1')).toEqual({ loadedCount: 40, scrollY: 640 })
  })

  it('keeps each catalog journey apart', () => {
    saveCatalogReturn('courses', { itemId: 'same-id', query: { q: 'course search' }, loadedCount: 20, scrollY: 100 })
    saveCatalogReturn('paths', { itemId: 'same-id', query: { q: 'path search' }, loadedCount: 10, scrollY: 50 })

    expect(catalogReturnQuery('paths', 'same-id')).toEqual({ q: 'path search' })
    expect(catalogReturnQuery('courses', 'same-id')).toEqual({ q: 'course search' })
  })

  it('forgets a journey stored in an older shape', () => {
    window.localStorage.setItem(
      'motifpath.catalog-return.courses.v1',
      JSON.stringify({ version: 1, itemId: 'c-1', filters: {}, searchText: '', loadedCount: 1, scrollY: 0 }),
    )

    expect(catalogReturnQuery('courses', 'c-1')).toBeNull()
    expect(restoreCatalogReturn('courses', 'c-1')).toBeNull()
  })
})
