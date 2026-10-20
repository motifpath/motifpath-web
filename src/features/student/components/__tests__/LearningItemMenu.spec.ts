import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import LearningItemMenu from '@/features/student/components/LearningItemMenu.vue'
import { makeEnrollment, makeStandalonePath } from '@/features/student/testing/learning'
import { buildLearning, type LearningItem } from '@/features/student/utils/learning'

const course = buildLearning([makeEnrollment({ course_title: 'Reading rhythm' })], [], null).inProgress[0] as LearningItem
const path = buildLearning([], [makeStandalonePath({ title: 'Open chords' })], null).inProgress[0] as LearningItem
const behind = buildLearning([makeEnrollment({ course_title: 'Reading rhythm', update_available: true })], [], null)
  .inProgress[0] as LearningItem

function mountMenu(item: LearningItem) {
  return mount(LearningItemMenu, { props: { open: true, item, trigger: null }, attachTo: document.body })
}

function rows() {
  return [...document.querySelectorAll('[data-test^="learning-menu-"]')].map((row) => row.textContent?.trim())
}

describe('LearningItemMenu', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('offers a course its details and leaving it', () => {
    mountMenu(course)

    expect(rows()).toEqual(['Course details', 'Leave course'])
  })

  it('offers a standalone path its details and removing it', () => {
    mountMenu(path)

    expect(rows()).toEqual(['Path details', 'Remove from Learning'])
  })

  it('offers the update first, while a newer version exists', () => {
    mountMenu(behind)

    expect(rows()).toEqual(['Update to the latest version', 'Course details', 'Leave course'])
  })

  it('asks to update', () => {
    const menu = mountMenu(behind)

    document.querySelector<HTMLElement>('[data-test="learning-menu-update"]')?.click()

    expect(menu.emitted('update')).toHaveLength(1)
  })

  it('is named after the item', () => {
    mountMenu(course)

    expect(document.querySelector('[data-test="learning-menu"]')?.getAttribute('aria-label')).toBe('Reading rhythm')
  })

  it('asks for the details', async () => {
    const menu = mountMenu(course)

    document.querySelector<HTMLElement>('[data-test="learning-menu-details"]')?.click()

    expect(menu.emitted('details')).toHaveLength(1)
  })

  it('asks to leave', () => {
    const menu = mountMenu(course)

    document.querySelector<HTMLElement>('[data-test="learning-menu-leave"]')?.click()

    expect(menu.emitted('leave')).toHaveLength(1)
  })
})
