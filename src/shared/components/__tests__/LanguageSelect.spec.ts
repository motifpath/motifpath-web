import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import LanguageSelect from '@/shared/components/LanguageSelect.vue'

describe('LanguageSelect', () => {
  it('offers the languages MotifPath is offered in, by name', () => {
    const wrapper = mount(LanguageSelect, { props: { modelValue: 'en' } })

    const options = wrapper.findAll('option')
    expect(options.map((o) => [o.attributes('value'), o.text()])).toEqual([
      ['en', 'English'],
      ['pt_BR', 'Portuguese'],
    ])
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('en')
  })

  it('emits the language picked', async () => {
    const wrapper = mount(LanguageSelect, { props: { modelValue: 'en' } })

    await wrapper.get('select').setValue('pt_BR')

    expect(wrapper.emitted('update:modelValue')).toEqual([['pt_BR']])
  })

  it('offers an empty choice, emitted as null, when one is labelled', async () => {
    const wrapper = mount(LanguageSelect, { props: { modelValue: null, emptyLabel: 'Any language' } })

    expect(wrapper.findAll('option')[0]?.text()).toBe('Any language')
    expect(wrapper.get<HTMLSelectElement>('select').element.value).toBe('')

    await wrapper.get('select').setValue('pt_BR')
    await wrapper.get('select').setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([['pt_BR'], [null]])
  })
})
