import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TextField from '@/shared/components/TextField.vue'

describe('TextField', () => {
  it('labels its input', () => {
    const wrapper = mount(TextField, { props: { label: 'First name', modelValue: '' } })

    const input = wrapper.get('input')
    const label = wrapper.get('label')
    expect(label.text()).toBe('First name')
    expect(label.attributes('for')).toBe(input.attributes('id'))
  })

  it('shows its value and reports what is typed', async () => {
    const wrapper = mount(TextField, { props: { label: 'Last name', modelValue: 'Sil' } })

    expect(wrapper.get('input').element.value).toBe('Sil')
    await wrapper.get('input').setValue('Silva')

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Silva'])
  })

  it('says what is wrong and marks the input invalid', () => {
    const wrapper = mount(TextField, { props: { label: 'Last name', modelValue: '', error: 'Enter your last name.' } })

    const input = wrapper.get('input')
    const error = wrapper.get('[data-test="text-field-error"]')
    expect(error.text()).toBe('Enter your last name.')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(error.attributes('id'))
  })

  it('is not marked invalid without an error', () => {
    const wrapper = mount(TextField, { props: { label: 'First name', modelValue: 'Dora' } })

    expect(wrapper.get('input').attributes('aria-invalid')).toBeUndefined()
    expect(wrapper.find('[data-test="text-field-error"]').exists()).toBe(false)
  })

  it('takes the focus when asked to', () => {
    const wrapper = mount(TextField, { props: { label: 'Last name', modelValue: '', autofocus: true }, attachTo: document.body })

    expect(document.activeElement).toBe(wrapper.get('input').element)
    wrapper.unmount()
  })
})
