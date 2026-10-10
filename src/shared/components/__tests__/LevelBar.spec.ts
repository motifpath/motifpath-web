import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import LevelBar from '@/shared/components/LevelBar.vue'
import { i18n } from '@/i18n'

afterEach(() => {
  i18n.global.locale.value = 'en'
})

describe('LevelBar', () => {
  it('names every level with its count in the legend', () => {
    const wrapper = mount(LevelBar, { props: { counts: { learning: 5, accurate: 7, fluent: 4, retained: 2 } } })

    const legend = wrapper.findAll('[data-test="level-legend-item"]').map((item) => item.text())
    expect(legend).toEqual(['5 learning', '7 accurate', '4 fluent', '2 retained'])
  })

  it('draws one segment per level that has skills, in level order', () => {
    const wrapper = mount(LevelBar, { props: { counts: { learning: 5, accurate: 0, fluent: 4, retained: 2 } } })

    const segments = wrapper.findAll('[data-test="level-segment"]').map((segment) => segment.attributes('data-level'))
    expect(segments).toEqual(['learning', 'fluent', 'retained'])
  })

  it('keeps an empty track when no skill has a level yet', () => {
    const wrapper = mount(LevelBar, { props: { counts: { learning: 0, accurate: 0, fluent: 0, retained: 0 } } })

    expect(wrapper.findAll('[data-test="level-segment"]')).toHaveLength(0)
    expect(wrapper.find('[data-test="level-track"]').exists()).toBe(true)
  })

  it('reads in pt-BR, agreeing in number', () => {
    i18n.global.locale.value = 'pt-BR'
    const wrapper = mount(LevelBar, { props: { counts: { learning: 5, accurate: 1, fluent: 4, retained: 2 } } })

    const legend = wrapper.findAll('[data-test="level-legend-item"]').map((item) => item.text())
    expect(legend).toEqual(['5 aprendendo', '1 precisa', '4 fluentes', '2 retidas'])
  })
})
