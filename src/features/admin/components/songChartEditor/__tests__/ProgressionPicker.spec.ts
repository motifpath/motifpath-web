import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import ProgressionPicker from '@/features/admin/components/songChartEditor/ProgressionPicker.vue'

const progression = (key: string, en: string): components['schemas']['Progression'] => ({
  progression_id: key,
  key,
  mode: 'major',
  bars: [],
  borrowed_bars: [],
  in_drills: true,
  confusable: [],
  names: { en },
  song_chart_count: 0,
  created_by: null,
  created_at: null,
})
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

  it('marks only the progressions the drills do not use', () => {
    const chartOnly = { ...progression('major/I-bVII-IV-I', 'I–♭VII–IV–I'), in_drills: false }
    const wrapper = mount(ProgressionPicker, { props: { progressions: [progressions[0]!, chartOnly], tagged: [] } })

    const marks = options(wrapper).map((o) => o.find('[data-test="chart-only"]').exists())
    expect(marks).toEqual([false, true])
    expect(options(wrapper)[1]!.get('[data-test="chart-only"]').text()).toBe('Chart only')
  })

  it('offers no way to remove a progression', () => {
    expect(mountPicker().find('[data-test="remove-progression"]').exists()).toBe(false)
  })

  it('offers to create what it can not find, read as numerals', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="progression-search"]').setValue('I bVII IV')

    expect(wrapper.get('[data-test="no-progression"]').text()).toBe('No progression is I–♭VII–IV yet.')
    const create = wrapper.get('[data-test="create-progression"]')
    expect(create.text()).toBe('Create “I–♭VII–IV”')
    expect(wrapper.get('[data-test="create-progression-hint"]').text()).toBe('Read as numerals: I · ♭VII · IV — major. You can change it before creating.')

    await create.trigger('click')
    expect(wrapper.emitted('create')).toEqual([['I bVII IV']])
  })

  it('offers an empty form when a name finds nothing', async () => {
    const wrapper = mountPicker()

    await wrapper.get('[data-test="progression-search"]').setValue('bossa')
    expect(wrapper.find('[data-test="create-progression-hint"]').exists()).toBe(false)

    await wrapper.get('[data-test="create-progression"]').trigger('click')
    expect(wrapper.emitted('create')).toEqual([['']])
  })

  it('offers nothing to create while the search finds something, or before a search', async () => {
    const wrapper = mountPicker()
    expect(wrapper.find('[data-test="create-progression"]').exists()).toBe(false)

    await wrapper.get('[data-test="progression-search"]').setValue('doo')
    expect(wrapper.find('[data-test="create-progression"]').exists()).toBe(false)
  })
})
