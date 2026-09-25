import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import type { components } from '@/api/generated/core-domain'

type UserRef = components['schemas']['UserRef']

const bob: UserRef = { user_id: 'u-bob', display_name: 'Bob Martins' }
const carol: UserRef = { user_id: 'u-carol', display_name: 'Carol Dias' }

const creatorsState = {
  creators: ref<UserRef[]>([]),
  nameQuery: ref(''),
  isLoading: ref(false),
  error: ref(false),
  retry: vi.fn(),
}
const useCourseCreators = vi.fn((_scope: string) => creatorsState)
vi.mock('@/shared/composables/useCourseCreators', () => ({
  useCourseCreators: (scope: string) => useCourseCreators(scope),
}))

import TeacherFilterPicker from '@/shared/components/TeacherFilterPicker.vue'

function mountPicker(modelValue: UserRef | null = null, scope?: 'catalog' | 'managed') {
  return mount(TeacherFilterPicker, { props: { modelValue, ...(scope ? { scope } : {}) }, attachTo: document.body })
}

function selections(wrapper: ReturnType<typeof mountPicker>) {
  return wrapper.emitted('update:modelValue')?.map(([value]) => value)
}

describe('TeacherFilterPicker', () => {
  beforeEach(() => {
    creatorsState.creators.value = [bob, carol]
    creatorsState.nameQuery.value = ''
    creatorsState.isLoading.value = false
    creatorsState.error.value = false
    vi.clearAllMocks()
  })

  it("lists the catalog's teachers by default, or the managed courses' teachers when asked", () => {
    mountPicker()
    mountPicker(null, 'managed')

    expect(useCourseCreators.mock.calls.map(([scope]) => scope)).toEqual(['catalog', 'managed'])
  })

  it('is a collapsed combobox until focused', () => {
    const input = mountPicker().get('[data-test="teacher-filter-input"]')

    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('false')
  })

  it('lists the teachers in the order the server gives once focused', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="teacher-filter-input"]').trigger('focus')

    expect(wrapper.get('[data-test="teacher-filter-input"]').attributes('aria-expanded')).toBe(
      'true',
    )
    const options = wrapper.findAll('[role="option"]')
    expect(options.map((o) => o.text())).toEqual(['Bob Martins', 'Carol Dias'])
  })

  it('searches teachers by the name typed', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="teacher-filter-input"]').setValue('dias')

    expect(creatorsState.nameQuery.value).toBe('dias')
  })

  it('selects a teacher on click and closes the list', async () => {
    const wrapper = mountPicker()
    await wrapper.get('[data-test="teacher-filter-input"]').trigger('focus')

    await wrapper.findAll('[role="option"]')[1]!.trigger('mousedown')

    expect(selections(wrapper)).toEqual([carol])
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('selects the highlighted teacher with the arrow keys and Enter', async () => {
    const wrapper = mountPicker()
    const input = wrapper.get('[data-test="teacher-filter-input"]')
    await input.trigger('focus')

    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toBe(
      wrapper.findAll('[role="option"]')[1]!.attributes('id'),
    )
    await input.trigger('keydown', { key: 'Enter' })

    expect(selections(wrapper)).toEqual([carol])
  })

  it('closes the list on Escape without selecting', async () => {
    const wrapper = mountPicker()
    const input = wrapper.get('[data-test="teacher-filter-input"]')
    await input.trigger('focus')

    await input.trigger('keydown', { key: 'Escape' })

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
    expect(selections(wrapper)).toBeUndefined()
  })

  it('shows the selected teacher, even one picked elsewhere, and clears it', async () => {
    const wrapper = mountPicker(carol)

    expect(
      (wrapper.get('[data-test="teacher-filter-input"]').element as HTMLInputElement).value,
    ).toBe('Carol Dias')
    await wrapper.get('[data-test="teacher-filter-clear"]').trigger('click')

    expect(selections(wrapper)).toEqual([null])
  })

  it('offers no clear control while no teacher is selected', () => {
    expect(mountPicker().find('[data-test="teacher-filter-clear"]').exists()).toBe(false)
  })

  it('says so when no teacher matches the name', async () => {
    creatorsState.creators.value = []
    const wrapper = mountPicker()

    await wrapper.get('[data-test="teacher-filter-input"]').trigger('focus')

    expect(wrapper.find('[data-test="teacher-filter-no-matches"]').exists()).toBe(true)
  })

  it('offers a retry when the teachers fail to load', async () => {
    creatorsState.creators.value = []
    creatorsState.error.value = true
    const wrapper = mountPicker()
    await wrapper.get('[data-test="teacher-filter-input"]').trigger('focus')

    await wrapper.get('[data-test="teacher-filter-retry"]').trigger('mousedown')

    expect(creatorsState.retry).toHaveBeenCalled()
  })
})
