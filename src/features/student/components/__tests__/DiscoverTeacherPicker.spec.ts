import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import DiscoverTeacherPicker from '@/features/student/components/DiscoverTeacherPicker.vue'

const teachers = [
  { user_id: 'u-ana', display_name: 'Ana Lima', item_count: 3 },
  { user_id: 'u-bob', display_name: 'Bob Martins', item_count: 1 },
]

function mountPicker(props: { scope?: 'catalog' | 'path-catalog'; modelValue?: string } = {}) {
  return mount(DiscoverTeacherPicker, { props: { scope: 'catalog', modelValue: undefined, ...props } })
}

type Wrapper = ReturnType<typeof mountPicker>

const options = (wrapper: Wrapper) => wrapper.findAll('[data-test="teacher-option"]')
const labels = (wrapper: Wrapper) => options(wrapper).map((option) => option.text())

function option(wrapper: Wrapper, label: string) {
  const found = options(wrapper).find((candidate) => candidate.text() === label)
  if (!found) throw new Error(`no option ${label}`)
  return found
}

beforeEach(() => {
  GET.mockReset()
  GET.mockResolvedValue({ data: teachers })
})
afterEach(() => vi.useRealTimers())

describe('DiscoverTeacherPicker', () => {
  it('lists Any teacher first, then the teachers of the courses', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/catalog/creators', expect.anything())
    expect(labels(wrapper)).toEqual(['Any teacher', 'Ana Lima', 'Bob Martins'])
  })

  it('lists the teachers of the paths on Paths', async () => {
    mountPicker({ scope: 'path-catalog' })
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/catalog/path-creators', expect.anything())
  })

  it('marks the chosen teacher, or Any teacher when none is', async () => {
    const anyone = mountPicker()
    await flushPromises()
    expect(option(anyone, 'Any teacher').attributes('aria-checked')).toBe('true')

    const wrapper = mountPicker({ modelValue: 'u-bob' })
    await flushPromises()
    expect(option(wrapper, 'Bob Martins').attributes('aria-checked')).toBe('true')
    expect(option(wrapper, 'Any teacher').attributes('aria-checked')).toBe('false')
  })

  it('hands back the teacher chosen, with their name, or nobody for Any teacher', async () => {
    const wrapper = mountPicker({ modelValue: 'u-bob' })
    await flushPromises()

    await option(wrapper, 'Ana Lima').trigger('click')
    await option(wrapper, 'Any teacher').trigger('click')

    expect(wrapper.emitted('choose')).toEqual([[{ user_id: 'u-ana', display_name: 'Ana Lima' }], [null]])
  })

  it('narrows the list by name once typing pauses', async () => {
    vi.useFakeTimers()
    const wrapper = mountPicker()
    await flushPromises()

    await wrapper.get('input').setValue('ana')
    await vi.runAllTimersAsync()

    expect(GET).toHaveBeenLastCalledWith('/catalog/creators', { params: { query: { q: 'ana' } } })
  })

  it('says when no teacher has that name', async () => {
    vi.useFakeTimers()
    const wrapper = mountPicker()
    await flushPromises()
    GET.mockResolvedValue({ data: [] })

    await wrapper.get('input').setValue('zed')
    await vi.runAllTimersAsync()
    await flushPromises()

    expect(labels(wrapper)).toEqual(['Any teacher'])
    expect(wrapper.text()).toContain('No teacher matches that name.')
  })

  it('offers to try again when the teachers fail to load', async () => {
    GET.mockResolvedValueOnce({ error: { status: 500 } })
    const wrapper = mountPicker()
    await flushPromises()

    expect(wrapper.text()).toContain("We couldn't load the teachers.")
    await wrapper.get('[data-test="teacher-retry"]').trigger('click')
    await flushPromises()

    expect(labels(wrapper)).toEqual(['Any teacher', 'Ana Lima', 'Bob Martins'])
  })
})
