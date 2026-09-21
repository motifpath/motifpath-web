import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

// The player library registers web components that need a real browser to
// play anything; what is under test here is the wrapper around them, so the
// library imports are stubbed and the events it would raise are dispatched by
// hand.
vi.mock('vidstack/player', () => ({}))
vi.mock('vidstack/player/ui', () => ({}))
vi.mock('vidstack/player/styles/base.css', () => ({}))

import LessonPlayer from '@/features/student/components/LessonPlayer.vue'

const SRC = 'https://cdn.example.test/lesson.mp4'

function mountPlayer() {
  return mount(LessonPlayer, { props: { src: SRC } })
}

describe('LessonPlayer', () => {
  it('plays the given source', () => {
    const wrapper = mountPlayer()

    expect(wrapper.get('media-player').attributes('src')).toBe(SRC)
  })

  it('plays inline on phones instead of taking over the screen', () => {
    const wrapper = mountPlayer()

    expect(wrapper.get('media-player').attributes('playsinline')).toBeDefined()
  })

  it('does not ask for cross-origin access, so a video host needs no CORS headers', () => {
    const wrapper = mountPlayer()

    expect(wrapper.get('media-player').attributes('crossorigin')).toBeUndefined()
  })

  it('reports the playback position in seconds as it advances', async () => {
    const wrapper = mountPlayer()

    await wrapper
      .get('media-player')
      .element.dispatchEvent(new CustomEvent('time-update', { detail: { currentTime: 12.5 } }))

    expect(wrapper.emitted('time')).toEqual([[12.5]])
  })

  it('reports when the video ends', async () => {
    const wrapper = mountPlayer()

    await wrapper.get('media-player').element.dispatchEvent(new Event('ended'))

    expect(wrapper.emitted('ended')).toHaveLength(1)
  })

  it('reports when the video fails to load', async () => {
    const wrapper = mountPlayer()

    await wrapper
      .get('media-player')
      .element.dispatchEvent(new CustomEvent('error', { detail: {} }))

    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  describe('controls', () => {
    it.each([
      ['media-play-button', 'Play'],
      ['media-time-slider', 'Seek'],
      ['media-mute-button', 'Mute'],
      ['media-fullscreen-button', 'Fullscreen'],
    ])('gives the %s an accessible name', (tag, name) => {
      const wrapper = mountPlayer()

      expect(wrapper.get(tag).attributes('aria-label')).toBe(name)
    })

    it('shows the playback position and the length of the video', () => {
      const wrapper = mountPlayer()

      expect(wrapper.find('media-time[type="current"]').exists()).toBe(true)
      expect(wrapper.find('media-time[type="duration"]').exists()).toBe(true)
    })

    it('toggles playback when the video area is tapped, so a tap never reaches the embedded player', () => {
      const wrapper = mountPlayer()

      const gesture = wrapper.get('media-gesture')
      expect(gesture.attributes('event')).toBe('pointerup')
      expect(gesture.attributes('action')).toBe('toggle:paused')
    })
  })

  describe('layout', () => {
    it('leaves the video provider unstyled, so the player can lay it out itself', () => {
      const wrapper = mountPlayer()

      const provider = wrapper.get('media-provider')
      expect(provider.attributes('class')).toBeUndefined()
      expect(provider.attributes('style')).toBeUndefined()
    })

    it('uses no inline styles anywhere', () => {
      const wrapper = mountPlayer()

      expect(wrapper.find('[style]').exists()).toBe(false)
    })
  })
})
