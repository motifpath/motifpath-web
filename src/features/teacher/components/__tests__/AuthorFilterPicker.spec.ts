import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import AuthorFilterPicker from '@/features/teacher/components/AuthorFilterPicker.vue'

const bob = { user_id: 'u-bob', display_name: 'Bob Martins', item_count: 38 }
const ana = { user_id: 'u-ana', display_name: 'Ana Souza', item_count: 214 }
const lima = { user_id: 'u-lima', display_name: 'Ana Lima', item_count: 1 }

type Props = InstanceType<typeof AuthorFilterPicker>['$props']

async function mountPicker(props: Partial<Props> = {}) {
  const wrapper = mount(AuthorFilterPicker, {
    props: {
      scope: 'diagrams',
      section: 'diagrams',
      modelValue: undefined,
      me: { user_id: 'u-bob', display_name: 'Bob Martins' },
      ...props,
    },
  })
  await flushPromises()
  return wrapper
}

const options = (wrapper: Awaited<ReturnType<typeof mountPicker>>) =>
  wrapper
    .findAll('[data-test="author-option"]')
    .map((option) => option.findAll('span').map((part) => part.text()).join(' '))

beforeEach(() => {
  GET.mockReset()
  GET.mockResolvedValue({ data: [ana, bob, lima] })
})

describe('AuthorFilterPicker', () => {
  it('offers Anyone, then Me, then the other authors, each with how many items they have', async () => {
    const wrapper = await mountPicker()

    expect(GET).toHaveBeenCalledWith('/diagrams/creators', { params: { query: {} } })
    expect(options(wrapper)).toEqual([
      'Anyone',
      'Me — Bob Martins 38 diagrams',
      'Ana Souza 214 diagrams',
      'Ana Lima 1 diagram',
    ])
  })

  it('offers Me even with nothing authored yet', async () => {
    GET.mockResolvedValue({ data: [ana] })
    const wrapper = await mountPicker()

    expect(options(wrapper).slice(0, 2)).toEqual(['Anyone', 'Me — Bob Martins'])
  })

  it('marks the chosen author', async () => {
    const wrapper = await mountPicker({ modelValue: 'u-ana' })

    const checked = wrapper.findAll('[data-test="author-option"]').filter((o) => o.attributes('aria-checked') === 'true')
    expect(checked.map((o) => o.text())).toEqual([expect.stringContaining('Ana Souza')])
  })

  it('chooses an author', async () => {
    const wrapper = await mountPicker()

    await wrapper.findAll('[data-test="author-option"]')[2]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['u-ana']])
  })

  it('clears the author with Anyone', async () => {
    const wrapper = await mountPicker({ modelValue: 'u-ana' })

    await wrapper.findAll('[data-test="author-option"]')[0]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[undefined]])
  })

  it('searches the authors by name', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountPicker()
      GET.mockResolvedValue({ data: [ana, lima] })

      await wrapper.get('input[type="search"]').setValue('ana')
      await vi.runAllTimersAsync()

      expect(GET).toHaveBeenLastCalledWith('/diagrams/creators', { params: { query: { q: 'ana' } } })
      expect(options(wrapper).slice(2)).toEqual(['Ana Souza 214 diagrams', 'Ana Lima 1 diagram'])
    } finally {
      vi.useRealTimers()
    }
  })

  it('names the items of its own section', async () => {
    GET.mockResolvedValue({ data: [ana] })
    const wrapper = await mountPicker({ scope: 'lessons', section: 'lessons' })

    expect(GET).toHaveBeenCalledWith('/content-nodes/creators', { params: { query: {} } })
    expect(options(wrapper)).toContain('Ana Souza 214 lessons')
  })

  it('offers Try again when the authors cannot be loaded', async () => {
    GET.mockResolvedValue({ error: { message: 'down' } })
    const wrapper = await mountPicker()
    GET.mockResolvedValue({ data: [ana] })

    await wrapper.get('[data-test="author-retry"]').trigger('click')
    await flushPromises()

    expect(options(wrapper)).toContain('Ana Souza 214 diagrams')
  })
})
