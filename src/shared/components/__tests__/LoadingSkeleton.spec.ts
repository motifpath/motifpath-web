import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

import LoadingSkeleton from '@/shared/components/LoadingSkeleton.vue'

describe('LoadingSkeleton', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows nothing for the first 300 ms, so a fast load never flashes', async () => {
    const wrapper = mount(LoadingSkeleton)

    vi.advanceTimersByTime(299)
    await nextTick()

    expect(wrapper.findAll('[data-test="skeleton-block"]')).toHaveLength(0)
  })

  it('then draws placeholders shaped like the content', async () => {
    const wrapper = mount(LoadingSkeleton, { props: { shape: 'cards', count: 4 } })

    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.findAll('[data-test="skeleton-block"]')).toHaveLength(4)
  })

  it('draws a video lesson as a video-shaped block with the lines of its title under it', async () => {
    const wrapper = mount(LoadingSkeleton, { props: { shape: 'video' } })

    vi.advanceTimersByTime(300)
    await nextTick()

    const blocks = wrapper.findAll('[data-test="skeleton-block"]')
    expect(blocks[0].classes()).toContain('aspect-video')
    expect(blocks.length).toBeGreaterThan(1)
  })

  it('tells assistive technology the content is loading, from the start', () => {
    const wrapper = mount(LoadingSkeleton)

    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('Loading')
  })

  it('is never a spinner or "Loading…" text on screen', async () => {
    const wrapper = mount(LoadingSkeleton)
    vi.advanceTimersByTime(300)
    await nextTick()

    expect(wrapper.get('[data-test="skeleton-label"]').classes()).toContain('sr-only')
  })
})
