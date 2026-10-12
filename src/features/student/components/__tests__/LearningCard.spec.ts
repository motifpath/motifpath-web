import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LearningCard from '@/features/student/components/LearningCard.vue'
import {
  makeCurrentPath as currentPath,
  makeEnrollment as enrollment,
  makeStandalonePath as standalonePath,
} from '@/features/student/testing/learning'
import { buildLearning, type LearningItem } from '@/features/student/utils/learning'

function only(groups: ReturnType<typeof buildLearning>): LearningItem {
  const item = [...groups.inProgress, ...groups.finished, ...groups.left][0]
  if (!item) throw new Error('no item')
  return item
}

function mountCard(item: LearningItem) {
  return mount(LearningCard, { props: { item } })
}

describe('LearningCard', () => {
  it('reads a course as its kind and part, its title, and a count of parts', () => {
    const card = mountCard(only(buildLearning([enrollment({ active_checkpoint_position: 2, checkpoint_count: 4 })], [], null)))

    expect(card.get('[data-test="learning-eyebrow"]').text()).toBe('Course · Part 2 of 4')
    expect(card.get('[data-test="learning-title"]').text()).toBe('Guitar foundations')
    expect(card.text()).toContain('1 of 4 parts')
  })

  it('reads a path as its kind and a count of lessons', () => {
    const card = mountCard(only(buildLearning([], [standalonePath({ completed_count: 5, lesson_count: 9 })], null)))

    expect(card.get('[data-test="learning-eyebrow"]').text()).toBe('Path')
    expect(card.text()).toContain('5 of 9 lessons')
  })

  it('names the teacher who assigned a path', () => {
    const card = mountCard(
      only(buildLearning([], [standalonePath({ assigned_by: { user_id: 't-1', display_name: 'Ana' } })], null)),
    )

    expect(card.get('[data-test="learning-eyebrow"]').text()).toBe('Path · Assigned by Ana')
  })

  it('marks the current item with a badge', () => {
    const card = mountCard(only(buildLearning([enrollment()], [], currentPath())))

    expect(card.get('[data-test="learning-current"]').text()).toBe('Current')
    expect(card.get('[data-test="learning-card"]').attributes('data-state')).toBe('current')
  })

  it('shows no badge on an item that is not current', () => {
    const card = mountCard(only(buildLearning([enrollment()], [], null)))

    expect(card.find('[data-test="learning-current"]').exists()).toBe(false)
  })

  it('reads a finished course as finished, with a full bar', () => {
    const card = mountCard(only(buildLearning([enrollment({ status: 'completed', checkpoint_count: 4 })], [], null)))

    expect(card.get('[data-test="learning-eyebrow"]').text()).toBe('Course · Finished')
    expect(card.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('4')
  })

  it('offers a left course again from part 1, with no bar', () => {
    const card = mountCard(only(buildLearning([enrollment({ status: 'abandoned' })], [], null)))

    expect(card.text()).toContain('Start again from part 1')
    expect(card.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('shows the thumbnail when there is one', () => {
    const card = mountCard(only(buildLearning([enrollment({ course_thumbnail_url: 'https://cdn/c.jpg' })], [], null)))

    expect(card.get('img').attributes('src')).toBe('https://cdn/c.jpg')
  })

  it("shows the kind's icon on a tile when there is no thumbnail", () => {
    const card = mountCard(only(buildLearning([enrollment()], [], null)))

    expect(card.find('img').exists()).toBe(false)
    expect(card.find('[data-test="learning-thumb-fallback"]').exists()).toBe(true)
  })

  it('has no button other than the row and its ⋯', () => {
    const card = mountCard(only(buildLearning([enrollment()], [], null)))

    expect(card.findAll('button').map((button) => button.attributes('data-test'))).toEqual(['learning-row', 'learning-more'])
  })

  it('asks to open the item when the row is tapped', async () => {
    const card = mountCard(only(buildLearning([enrollment()], [], null)))

    await card.get('[data-test="learning-row"]').trigger('click')

    expect(card.emitted('open')).toHaveLength(1)
    expect(card.emitted('more')).toBeUndefined()
  })

  it('asks for its menu when ⋯ is tapped, naming the item for a screen reader', async () => {
    const card = mountCard(only(buildLearning([enrollment()], [], null)))
    const more = card.get('[data-test="learning-more"]')

    await more.trigger('click')

    expect(more.attributes('aria-label')).toBe('More for Guitar foundations')
    expect(card.emitted('more')?.[0]?.[0]).toBe(more.element)
    expect(card.emitted('open')).toBeUndefined()
  })
})
