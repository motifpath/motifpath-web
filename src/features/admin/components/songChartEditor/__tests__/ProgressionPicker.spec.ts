import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ProgressionPicker from '@/features/admin/components/songChartEditor/ProgressionPicker.vue'

const progression = (key: string, en: string) => ({ progression_id: key, key, bars: [], confusable: [], names: { en } })
const progressions = [
  progression('I-IV-V-I', 'I–IV–V–I'),
  progression('I-IV-I-V', 'I–IV–I–V'),
  progression('I-vi-IV-V', 'I–vi–IV–V (doo-wop)'),
  progression('ii-V-I', 'ii–V–I'),
]

function mountPicker(tagged: string[] = []) {
  return mount(ProgressionPicker, { props: { progressions, tagged } })
}

const options = (wrapper: ReturnType<typeof mountPicker>) => wrapper.findAll('[data-test="progression-option"]')

describe('ProgressionPicker', () => {
  it('lists the whole catalog by its names, with a check on the ones the section is tagged with', () => {
    const wrapper = mountPicker(['I-IV-I-V'])

    expect(options(wrapper).map((o) => o.text())).toEqual(['I–IV–V–I', 'I–IV–I–V', 'I–vi–IV–V (doo-wop)', 'ii–V–I'])
    expect(options(wrapper).map((o) => [o.element.tagName, o.attributes('aria-pressed')])).toEqual([
      ['BUTTON', 'false'],
      ['BUTTON', 'true'],
      ['BUTTON', 'false'],
      ['BUTTON', 'false'],
    ])
    expect(wrapper.find('[role="menu"], [role="menuitemcheckbox"]').exists()).toBe(false)
  })

  it('finds a progression by a word of its name or by its numerals as typed', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="progression-search"]').setValue('doo')
    expect(options(wrapper).map((o) => o.text())).toEqual(['I–vi–IV–V (doo-wop)'])

    await wrapper.get('[data-test="progression-search"]').setValue('ii-v')
    expect(options(wrapper).map((o) => o.text())).toEqual(['ii–V–I'])
  })

  it('says so when nothing matches', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="progression-search"]').setValue('bossa')

    expect(options(wrapper)).toHaveLength(0)
    expect(wrapper.get('[data-test="no-progression"]').text()).toBe('No progression matches “bossa”')
  })

  it('tags or untags the section with the progression picked', async () => {
    const wrapper = mountPicker(['I-IV-I-V'])

    await options(wrapper)[0]!.trigger('click')
    await options(wrapper)[1]!.trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([['I-IV-V-I'], ['I-IV-I-V']])
  })
})
