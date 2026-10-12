import { mount, RouterLinkStub } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([
      { instrument_id: 'i-guitar', names: { en: 'Guitar' }, languages: ['en'] },
      { instrument_id: 'i-bass', names: { en: 'Bass' }, languages: ['en'] },
    ]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))

import CatalogCard from '@/features/student/components/CatalogCard.vue'
import type { CatalogBadge, CatalogItem } from '@/features/student/utils/catalogItem'

const BLUES: CatalogItem = {
  kind: 'course',
  id: 'c-blues',
  title: 'Blues basics',
  level: 'beginner',
  language: 'en',
  createdBy: { user_id: 'u-bruno', display_name: 'Bruno' },
  instrumentIds: ['i-guitar'],
  partCount: 4,
  lessonCount: 44,
}
const OPEN_CHORDS: CatalogItem = { ...BLUES, kind: 'path', id: 'lp-open', title: 'Open chords', partCount: undefined, lessonCount: 9 }

function mountCard(item: CatalogItem, badge: CatalogBadge | null = null, layout: 'row' | 'tile' = 'row') {
  return mount(CatalogCard, {
    props: { item, badge, layout, to: { name: 'course-detail', params: { courseId: item.id } } },
    global: { stubs: { RouterLink: RouterLinkStub } },
  })
}

describe('CatalogCard', () => {
  it('reads a course as its level and language, title, teacher and size', () => {
    const card = mountCard(BLUES)

    expect(card.get('[data-test="catalog-eyebrow"]').text()).toBe('Beginner · English')
    expect(card.get('[data-test="catalog-title"]').text()).toBe('Blues basics')
    expect(card.get('[data-test="catalog-byline"]').text()).toBe('by Bruno')
    expect(card.get('[data-test="catalog-size"]').text()).toBe('Guitar · 4 parts · 44 lessons')
  })

  it('counts a path in lessons only', () => {
    expect(mountCard(OPEN_CHORDS).get('[data-test="catalog-size"]').text()).toBe('Guitar · 9 lessons')
  })

  it('names every instrument an item is for', () => {
    const card = mountCard({ ...BLUES, instrumentIds: ['i-guitar', 'i-bass'] })
    expect(card.get('[data-test="catalog-size"]').text()).toBe('Guitar · Bass · 4 parts · 44 lessons')
  })

  it('is one link to the detail, with no button', () => {
    const card = mountCard(BLUES)

    expect(card.findComponent(RouterLinkStub).props('to')).toEqual({ name: 'course-detail', params: { courseId: 'c-blues' } })
    expect(card.findAll('button')).toHaveLength(0)
  })

  it('marks an item in Learning on its thumbnail', () => {
    expect(mountCard(BLUES, 'in-learning').get('[data-test="catalog-badge"]').text()).toBe('In Learning')
  })

  it('marks a finished item on its thumbnail', () => {
    expect(mountCard(BLUES, 'finished').get('[data-test="catalog-badge"]').text()).toBe('Finished')
  })

  it('has no badge for an item the student has not started', () => {
    expect(mountCard(BLUES).find('[data-test="catalog-badge"]').exists()).toBe(false)
  })

  it('shows the item’s icon on a tinted tile when it has no thumbnail', () => {
    expect(mountCard(BLUES).find('[data-test="catalog-thumb-fallback"]').exists()).toBe(true)
  })

  it('lays the same content out as a tile', () => {
    const card = mountCard(BLUES, null, 'tile')

    expect(card.get('[data-test="catalog-card"]').attributes('data-layout')).toBe('tile')
    expect(card.get('[data-test="catalog-title"]').text()).toBe('Blues basics')
  })
})
