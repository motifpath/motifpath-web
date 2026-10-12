import { mount } from '@vue/test-utils'
import { Trash2 } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'

import MenuRow from '@/shared/components/MenuRow.vue'

describe('MenuRow', () => {
  it('emits click', async () => {
    const wrapper = mount(MenuRow, { props: { label: 'Move up', icon: Trash2 } })

    await wrapper.trigger('click')

    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('reads as destructive for an action that removes something', () => {
    const wrapper = mount(MenuRow, { props: { label: 'Remove from course', icon: Trash2, danger: true } })

    expect(wrapper.classes()).toContain('text-danger')
  })

  it('reads as an ordinary row otherwise', () => {
    const wrapper = mount(MenuRow, { props: { label: 'Move up', icon: Trash2 } })

    expect(wrapper.classes()).toContain('text-ink')
    expect(wrapper.classes()).not.toContain('text-danger')
  })
})
