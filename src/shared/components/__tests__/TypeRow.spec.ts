import { mount } from '@vue/test-utils'
import { Crosshair } from 'lucide-vue-next'
import { describe, expect, it } from 'vitest'

import TypeRow from '@/shared/components/TypeRow.vue'

describe('TypeRow', () => {
  it('names the type and says what the student does', () => {
    const wrapper = mount(TypeRow, {
      props: { icon: Crosshair, label: 'Image recognition', description: 'Taps the right place on an image or a diagram.' },
    })

    expect(wrapper.get('[data-test="type-row-label"]').text()).toBe('Image recognition')
    expect(wrapper.get('[data-test="type-row-description"]').text()).toBe('Taps the right place on an image or a diagram.')
  })

  it('is one button that chooses the type', async () => {
    const wrapper = mount(TypeRow, { props: { icon: Crosshair, label: 'Image recognition', description: 'x' } })

    expect(wrapper.element.tagName).toBe('BUTTON')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})
