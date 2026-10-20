import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import StudentSearchField from '@/features/admin/components/alpha/StudentSearchField.vue'

const camilaDuarte = { user_id: 's-camila-duarte', display_name: 'Camila Duarte' }
const camilaRocha = { user_id: 's-camila-rocha', display_name: 'Camila Rocha' }

function serve(items: (typeof camilaDuarte)[]) {
  GET.mockResolvedValue({ data: { items, total: items.length, limit: 20, offset: 0 } })
}

async function mountField(modelValue: typeof camilaDuarte | null = null) {
  const wrapper = mount(StudentSearchField, { props: { modelValue }, attachTo: document.body })
  await flushPromises()
  return wrapper
}

const options = (wrapper: Awaited<ReturnType<typeof mountField>>) => wrapper.findAll('[role="option"]').map((o) => o.text())

beforeEach(() => {
  GET.mockReset()
  serve([camilaDuarte, camilaRocha])
})

describe('StudentSearchField', () => {
  it('offers every student, then the students whose name holds what is typed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const wrapper = await mountField()
    const input = wrapper.get('[role="combobox"]')

    await input.trigger('focus')
    expect(options(wrapper)).toEqual(['All students', 'Camila Duarte', 'Camila Rocha'])

    serve([camilaDuarte])
    await input.setValue('duarte')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(GET).toHaveBeenLastCalledWith('/admin/alpha-observation/students', { params: { query: { q: 'duarte', limit: 20 } } })
    expect(options(wrapper)).toEqual(['All students', 'Camila Duarte'])
    vi.useRealTimers()
  })

  it('picks a student', async () => {
    const wrapper = await mountField()
    await wrapper.get('[role="combobox"]').trigger('focus')

    await wrapper.findAll('[role="option"]')[1]!.trigger('mousedown')

    expect(wrapper.emitted('update:modelValue')).toEqual([[camilaDuarte]])
  })

  it('shows the picked student as a removable chip after the search, which keeps its place', async () => {
    const wrapper = await mountField(camilaDuarte)

    const children = wrapper.get('[data-test="student-search"]').element.children
    expect(children[0]!.querySelector('[role="combobox"]')).not.toBeNull()
    expect(children[1]!.getAttribute('data-test')).toBe('filter-chip')
    expect(wrapper.get('[data-test="filter-chip"]').text()).toBe('Camila Duarte')
    expect((wrapper.get('[role="combobox"]').element as HTMLInputElement).value).toBe('')

    await wrapper.get('[data-test="filter-chip"] button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  it('shows every student again with "All students"', async () => {
    const wrapper = await mountField(camilaDuarte)
    await wrapper.get('[role="combobox"]').trigger('focus')

    await wrapper.findAll('[role="option"]')[0]!.trigger('mousedown')

    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })

  it('says so when no student matches', async () => {
    serve([])
    const wrapper = await mountField()

    await wrapper.get('[role="combobox"]').trigger('focus')

    expect(wrapper.get('[role="status"]').text()).toBe('No student matches.')
  })

  it("says so when the students can't be searched, and searches again on retry", async () => {
    GET.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) })
    const wrapper = await mountField()
    await wrapper.get('[role="combobox"]').trigger('focus')

    expect(wrapper.get('[role="status"]').text()).toContain("Couldn't search the students.")
    await wrapper.get('[data-test="student-search-retry"]').trigger('mousedown')
    await flushPromises()

    expect(options(wrapper)).toEqual(['All students', 'Camila Duarte', 'Camila Rocha'])
  })
})
