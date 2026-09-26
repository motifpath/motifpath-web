import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import InstrumentPicker from '@/shared/components/InstrumentPicker.vue'

const instruments = [
  { instrument_id: 'i-guitar', names: { en: 'Guitar', pt_BR: 'Violão' }, languages: ['en', 'pt_BR'] },
  { instrument_id: 'i-bass', names: { en: 'Bass' }, languages: ['en'] },
]

async function mountPicker(modelValue: string[], props: { disabled?: boolean } = {}) {
  const wrapper = mount(InstrumentPicker, { props: { modelValue, ...props } })
  await flushPromises()
  return wrapper
}

describe('InstrumentPicker', () => {
  beforeEach(() => {
    GET.mockReset()
    GET.mockResolvedValue({ data: instruments, error: undefined, response: { status: 200 } })
  })

  it('offers "Every instrument" and each instrument by its name', async () => {
    const wrapper = await mountPicker([])

    expect(wrapper.get('[data-test="instrument-every"]').text()).toBe('Every instrument')
    expect(wrapper.get('[data-test="instrument-option-i-guitar"]').text()).toBe('Guitar')
    expect(wrapper.get('[data-test="instrument-option-i-bass"]').text()).toBe('Bass')
  })

  it('shows "Every instrument" as chosen when no instrument is', async () => {
    const wrapper = await mountPicker([])

    expect(wrapper.get('[data-test="instrument-every"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="instrument-option-i-guitar"]').attributes('aria-pressed')).toBe('false')
  })

  it('adds an instrument to the choice', async () => {
    const wrapper = await mountPicker(['i-guitar'])

    await wrapper.get('[data-test="instrument-option-i-bass"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[['i-guitar', 'i-bass']]])
  })

  it('removes a chosen instrument', async () => {
    const wrapper = await mountPicker(['i-guitar', 'i-bass'])

    await wrapper.get('[data-test="instrument-option-i-guitar"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[['i-bass']]])
  })

  it('goes back to every instrument', async () => {
    const wrapper = await mountPicker(['i-guitar'])

    expect(wrapper.get('[data-test="instrument-every"]').attributes('aria-pressed')).toBe('false')
    await wrapper.get('[data-test="instrument-every"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[[]]])
  })

  it('shows an error with a retry when the instruments fail to load', async () => {
    GET.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const wrapper = await mountPicker([])

    expect(wrapper.find('[data-test="instruments-error"]').exists()).toBe(true)
    await wrapper.get('[data-test="instruments-retry"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="instrument-option-i-guitar"]').exists()).toBe(true)
  })

  it('cannot be changed while disabled', async () => {
    const wrapper = await mountPicker([], { disabled: true })

    await wrapper.get('[data-test="instrument-option-i-guitar"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
