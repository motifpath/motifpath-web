import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive, ref, type ComputedRef } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))
vi.mock('@/shared/composables/useListInstruments', () => ({
  useListInstruments: () => ({
    instruments: ref([{ instrument_id: GUITAR, names: { en: 'Guitar' }, languages: ['en'] }]),
    isLoading: ref(false),
    error: ref(false),
    retry: vi.fn(),
  }),
}))

import { useDiscoverChips } from '@/features/student/composables/useDiscoverChips'
import type { DiscoverFilters } from '@/features/student/utils/discoverQuery'

const GUITAR = '3f4b6f2a-8c3e-4b1a-9d2e-7a1c5f0e9b21'
const BRUNO = '0b6f5d7e-1c2a-4e3b-9f8d-6a5b4c3d2e1f'
const SHUFFLE = '7a2d9e10-4f3b-4c5a-8e6d-1b2c3d4e5f60'

function answer(responses: Record<string, unknown>) {
  GET.mockImplementation((url: string) => Promise.resolve({ data: responses[url] ?? [] }))
}

function setup(filters: Partial<DiscoverFilters>) {
  const state = reactive({ q: '', filters: { levels: [], skills: [], concepts: [], ...filters } as DiscoverFilters })
  let chips!: ComputedRef<{ id: string; label: string }[]>
  const Host = defineComponent({
    setup() {
      chips = useDiscoverChips(state)
      return () => null
    },
  })
  mount(Host)
  return { state, chips }
}

beforeEach(() => GET.mockReset())

describe('useDiscoverChips', () => {
  it('names each level, the instrument and the language', () => {
    answer({})
    const { chips } = setup({ levels: ['beginner', 'advanced'], instrument: GUITAR, language: 'en' })

    expect(chips.value).toEqual([
      { id: 'levels:beginner', label: 'Beginner' },
      { id: 'levels:advanced', label: 'Advanced' },
      { id: 'instrument', label: 'Guitar' },
      { id: 'language', label: 'English' },
    ])
  })

  it('asks nothing while no teacher, skill or concept is on', async () => {
    answer({})
    setup({ levels: ['beginner'] })
    await flushPromises()

    expect(GET).not.toHaveBeenCalled()
  })

  it('names the teacher from the catalog’s teachers', async () => {
    answer({ '/catalog/creators': [{ user_id: BRUNO, display_name: 'Bruno', item_count: 3 }] })
    const { chips } = setup({ teacher: BRUNO })
    await flushPromises()

    expect(chips.value).toEqual([{ id: 'teacher', label: 'Bruno' }])
  })

  it('names a teacher who only has paths', async () => {
    answer({
      '/catalog/creators': [],
      '/catalog/path-creators': [{ user_id: BRUNO, display_name: 'Bruno', item_count: 1 }],
    })
    const { chips } = setup({ teacher: BRUNO })
    await flushPromises()

    expect(chips.value).toEqual([{ id: 'teacher', label: 'Bruno' }])
  })

  it('names a skill that arrived from context', async () => {
    answer({ '/knowledge-nodes': [{ node_id: SHUFFLE, kind: 'skill', names: { en: 'Shuffle rhythm' } }] })
    const { chips } = setup({ skills: [SHUFFLE] })
    await flushPromises()

    expect(GET).toHaveBeenCalledWith('/knowledge-nodes', { params: { query: { kind: 'skill' } } })
    expect(chips.value).toEqual([{ id: `skills:${SHUFFLE}`, label: 'Shuffle rhythm' }])
  })

  it('names a teacher chosen later', async () => {
    answer({ '/catalog/creators': [{ user_id: BRUNO, display_name: 'Bruno', item_count: 3 }] })
    const { state, chips } = setup({})
    state.filters = { ...state.filters, teacher: BRUNO }
    await nextTick()
    await flushPromises()

    expect(chips.value).toEqual([{ id: 'teacher', label: 'Bruno' }])
  })
})
