import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import InstrumentFilterSelect from '@/shared/components/InstrumentFilterSelect.vue'

const instruments = [
  { instrument_id: 'i-guitar', names: { en: 'Guitar', pt_BR: 'Violão' }, languages: ['en', 'pt_BR'] },
]

describe('InstrumentFilterSelect', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })
  })

  it('offers "Any instrument" and each instrument by name', async () => {
    const wrapper = mount(InstrumentFilterSelect, { props: { modelValue: null } })
    await flushPromises()

    const options = wrapper.findAll('option')
    expect(options.map((o) => o.text())).toEqual(['Any instrument', 'Guitar'])
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('')
  })

  it('emits the instrument picked, and null for any instrument', async () => {
    const wrapper = mount(InstrumentFilterSelect, { props: { modelValue: null } })
    await flushPromises()

    await wrapper.get('select').setValue('i-guitar')
    await wrapper.get('select').setValue('')

    expect(wrapper.emitted('update:modelValue')).toEqual([['i-guitar'], [null]])
  })
})
