import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ThumbnailImage from '@/shared/components/ThumbnailImage.vue'

describe('ThumbnailImage', () => {
  it('shows the thumbnail when there is one', () => {
    const wrapper = mount(ThumbnailImage, { props: { url: 'https://cdn.test/t.png' } })

    const image = wrapper.get('img')
    expect(image.attributes('src')).toBe('https://cdn.test/t.png')
    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(false)
  })

  it('shows a neutral placeholder when there is none', () => {
    const wrapper = mount(ThumbnailImage, { props: {} })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
  })

  it('falls back to the placeholder when the image fails to load', async () => {
    const wrapper = mount(ThumbnailImage, { props: { url: 'https://cdn.test/missing.png' } })

    await wrapper.get('img').trigger('error')

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('[data-test="thumbnail-placeholder"]').exists()).toBe(true)
  })

  it('tries a new url again after an earlier one failed', async () => {
    const wrapper = mount(ThumbnailImage, { props: { url: 'https://cdn.test/missing.png' } })
    await wrapper.get('img').trigger('error')

    await wrapper.setProps({ url: 'https://cdn.test/other.png' })

    expect(wrapper.get('img').attributes('src')).toBe('https://cdn.test/other.png')
  })
})
