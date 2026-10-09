import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StateBlock from '@/shared/components/StateBlock.vue'

describe('StateBlock', () => {
  it('says what happened in a title and one sentence', () => {
    const wrapper = mount(StateBlock, {
      props: { kind: 'empty', title: 'No courses yet', message: 'Courses you enrol in show up here.' },
    })

    expect(wrapper.get('h2').text()).toBe('No courses yet')
    expect(wrapper.text()).toContain('Courses you enrol in show up here.')
  })

  it.each([
    ['empty', 'lucide-inbox'],
    ['locked', 'lucide-lock'],
    ['notFound', 'lucide-search-x'],
    ['offline', 'lucide-wifi-off'],
  ] as const)('a %s state shows its icon in a disc', (kind, icon) => {
    const wrapper = mount(StateBlock, { props: { kind, title: 'Title', message: 'Message' } })

    expect(wrapper.get('[data-test="state-icon"]').find(`svg.${icon}`).exists()).toBe(true)
  })

  it('offers its one way forward', () => {
    const wrapper = mount(StateBlock, {
      props: { kind: 'empty', title: 'No courses yet', message: 'Message' },
      slots: { action: '<a data-test="find-course">Find a course</a>' },
    })

    expect(wrapper.find('[data-test="find-course"]').exists()).toBe(true)
  })
})
