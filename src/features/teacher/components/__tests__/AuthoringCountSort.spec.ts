import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import AuthoringCountSort from '@/features/teacher/components/AuthoringCountSort.vue'

enableAutoUnmount(afterEach)

type Props = InstanceType<typeof AuthoringCountSort>['$props']

function mountBar(props: Partial<Props> = {}) {
  return mount(AuthoringCountSort, {
    props: { section: 'diagrams', shown: 1284, sectionTotal: 1284, narrowed: false, sort: 'title', ...props },
    attachTo: document.body,
  })
}

function sheetOptions() {
  return [...document.querySelectorAll<HTMLButtonElement>('[data-test="sort-option"]')]
}

describe('AuthoringCountSort', () => {
  it("says the section's total when nothing narrows the list", () => {
    expect(mountBar().get('[data-test="list-count"]').text()).toBe('1,284 diagrams')
  })

  it('says how many match out of the section total when the list is narrowed', () => {
    const wrapper = mountBar({ shown: 46, narrowed: true })
    expect(wrapper.get('[data-test="list-count"]').text()).toBe('46 of 1,284 diagrams')
  })

  it("names each section's items", () => {
    expect(mountBar({ section: 'exercises', shown: 1, sectionTotal: 1 }).get('[data-test="list-count"]').text()).toBe(
      '1 exercise',
    )
    expect(mountBar({ section: 'lessons', shown: 2, sectionTotal: 9, narrowed: true }).get('[data-test="list-count"]').text()).toBe(
      '2 of 9 lessons',
    )
  })

  it('says only how many match while the section total is unknown', () => {
    expect(mountBar({ shown: 46, sectionTotal: null, narrowed: true }).get('[data-test="list-count"]').text()).toBe(
      '46 diagrams',
    )
  })

  it('shows the current sort', () => {
    expect(mountBar({ sort: 'updated' }).get('[data-test="sort-button"]').text()).toContain('Recently changed')
  })

  it('offers Name A–Z and Recently changed, with the current one checked', async () => {
    const wrapper = mountBar()

    await wrapper.get('[data-test="sort-button"]').trigger('click')

    expect(sheetOptions().map((option) => option.textContent?.trim())).toEqual(['Name A–Z', 'Recently changed'])
    expect(sheetOptions().map((option) => option.getAttribute('aria-checked'))).toEqual(['true', 'false'])
  })

  it('changes the sort and closes', async () => {
    const wrapper = mountBar()
    await wrapper.get('[data-test="sort-button"]').trigger('click')

    sheetOptions()[1]!.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:sort')).toEqual([['updated']])
    expect(sheetOptions()).toHaveLength(0)
  })
})
