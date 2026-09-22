import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// The player library registers web components that need a real browser to
// play anything; what is under test here is the wrapper around them, so the
// library imports are stubbed and the events it would raise are dispatched by
// hand.
vi.mock('vidstack/player', () => ({}))
vi.mock('vidstack/player/ui', () => ({}))
vi.mock('vidstack/player/styles/base.css', () => ({}))

// Defaults to landscape so every test that doesn't care about orientation
// doesn't have to set it up.
const canResizeAside = ref(true)
vi.mock('@/shared/composables/useMediaQuery', () => ({
  useMediaQuery: () => ({ matches: canResizeAside }),
}))

import LessonPlayer from '@/features/student/components/LessonPlayer.vue'

const SRC = 'https://cdn.example.test/lesson.mp4'
const ASIDE_WIDTH_KEY = 'motifpath:lesson-aside-width'

function mountPlayer(withAside = false) {
  return mount(
    LessonPlayer,
    withAside ? { props: { src: SRC }, slots: { aside: '<p>a cue</p>' } } : { props: { src: SRC } },
  )
}

async function fireDrag(wrapper: ReturnType<typeof mountPlayer>, fromX: number, toX: number) {
  const handle = wrapper.get('[data-test="aside-resize-handle"]')
  handle.element.dispatchEvent(new MouseEvent('pointerdown', { clientX: fromX, bubbles: true }))
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: toX }))
  window.dispatchEvent(new MouseEvent('pointerup', { clientX: toX }))
  await nextTick()
}

describe('LessonPlayer', () => {
  beforeEach(() => {
    canResizeAside.value = true
    localStorage.clear()
  })

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

  describe('aside content', () => {
    it('has no aside area when the caller passes nothing', () => {
      const wrapper = mountPlayer()

      expect(wrapper.find('[data-test="player-aside"]').exists()).toBe(false)
    })

    it("renders the caller's aside content inside the player, so it is included when the player goes fullscreen", () => {
      const wrapper = mount(LessonPlayer, {
        props: { src: SRC },
        slots: { aside: '<p data-test="cue-probe">a cue</p>' },
      })

      const player = wrapper.get('media-player')
      const aside = player.get('[data-test="player-aside"]')
      expect(aside.get('[data-test="cue-probe"]').text()).toBe('a cue')
    })

    it('gives the aside more room on a wide desktop screen, not a fixed sliver regardless of how much space there is', () => {
      const wrapper = mount(LessonPlayer, {
        props: { src: SRC },
        slots: { aside: '<p>a cue</p>' },
      })

      const classes = wrapper.get('[data-test="player-aside"]').classes()
      expect(classes).toContain('landscape:w-80')
      expect(classes).toContain('landscape:xl:w-96')
    })
  })

  describe('recovering from a video that failed to load', () => {
    it('starts a fresh provider when resetToken changes, so a stuck video engine is thrown away', async () => {
      const wrapper = mount(LessonPlayer, { props: { src: SRC, resetToken: 1 } })
      const before = wrapper.get('media-provider').element

      await wrapper.setProps({ resetToken: 2 })

      expect(wrapper.get('media-provider').element).not.toBe(before)
    })

    it('does not touch the video at all when resetToken is unchanged', async () => {
      const wrapper = mount(LessonPlayer, { props: { src: SRC, resetToken: 1 } })
      const before = wrapper.get('media-provider').element

      await wrapper.setProps({ src: SRC })

      expect(wrapper.get('media-provider').element).toBe(before)
    })

    it('keeps the aside content mounted across a reset, so an aria-live region stays observable', async () => {
      const wrapper = mount(LessonPlayer, {
        props: { src: SRC, resetToken: 1 },
        slots: { aside: '<p data-test="cue-probe">a cue</p>' },
      })
      const before = wrapper.get('[data-test="cue-probe"]').element

      await wrapper.setProps({ resetToken: 2 })

      expect(wrapper.get('[data-test="cue-probe"]').element).toBe(before)
    })

    it('keeps the player itself mounted across a reset, so its controls are not rebuilt', async () => {
      const wrapper = mount(LessonPlayer, { props: { src: SRC, resetToken: 1 } })
      const before = wrapper.get('media-player').element

      await wrapper.setProps({ resetToken: 2 })

      expect(wrapper.get('media-player').element).toBe(before)
    })
  })

  describe('resizing the aside', () => {
    it('has no resize handle when there is no aside to resize', () => {
      const wrapper = mountPlayer()

      expect(wrapper.find('[data-test="aside-resize-handle"]').exists()).toBe(false)
    })

    it('has no resize handle on a screen too small or too narrow to resize on', () => {
      canResizeAside.value = false

      const wrapper = mountPlayer(true)

      expect(wrapper.find('[data-test="aside-resize-handle"]').exists()).toBe(false)
    })

    it('marks the handle as a draggable separator for assistive technology', () => {
      const wrapper = mountPlayer(true)

      const handle = wrapper.get('[data-test="aside-resize-handle"]')
      expect(handle.attributes('role')).toBe('separator')
      expect(handle.attributes('aria-orientation')).toBe('vertical')
      expect(handle.attributes('tabindex')).toBe('0')
      expect(handle.attributes('aria-label')).toBe('Resize the notes panel')
    })

    it('stretches the handle to the full height of the row, not the zero-height box a flex child gets by default', () => {
      const wrapper = mountPlayer(true)

      expect(wrapper.get('[data-test="aside-resize-handle"]').classes()).toContain('self-stretch')
    })

    it('widens the aside when the handle is dragged toward the video', async () => {
      const wrapper = mountPlayer(true)

      await fireDrag(wrapper, 500, 100) // drag left by 400px

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 400px',
      )
    })

    it('never lets the aside shrink past a readable minimum', async () => {
      const wrapper = mountPlayer(true)

      await fireDrag(wrapper, 500, 450) // drag left by only 50px

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 240px',
      )
    })

    it('never lets the aside swallow the whole row', async () => {
      const wrapper = mountPlayer(true)

      await fireDrag(wrapper, 500, -1000) // drag left by 1500px

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 640px',
      )
    })

    it('remembers the dragged width for the next lesson opened in this browser', async () => {
      const wrapper = mountPlayer(true)

      await fireDrag(wrapper, 500, 100)

      expect(localStorage.getItem(ASIDE_WIDTH_KEY)).toBe('400')
    })

    it('starts a fresh lesson at the width remembered from a previous one', async () => {
      localStorage.setItem(ASIDE_WIDTH_KEY, '450')

      const wrapper = mountPlayer(true)
      await nextTick()

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 450px',
      )
    })

    it('ignores a corrupted stored width and falls back to the default size', async () => {
      localStorage.setItem(ASIDE_WIDTH_KEY, 'not-a-number')

      const wrapper = mountPlayer(true)
      await nextTick()

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toBeFalsy()
    })

    it('clamps a stored width that is now out of range', async () => {
      localStorage.setItem(ASIDE_WIDTH_KEY, '99999')

      const wrapper = mountPlayer(true)
      await nextTick()

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 640px',
      )
    })

    it('resizes with the keyboard, for a student who cannot drag', async () => {
      const wrapper = mountPlayer(true)
      await fireDrag(wrapper, 500, 100) // seed a known width (400px) to adjust from
      const handle = wrapper.get('[data-test="aside-resize-handle"]')

      await handle.trigger('keydown', { key: 'ArrowRight' })
      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 384px',
      )

      await handle.trigger('keydown', { key: 'ArrowLeft' })
      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 400px',
      )

      await handle.trigger('keydown', { key: 'Home' })
      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 240px',
      )

      await handle.trigger('keydown', { key: 'End' })
      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toContain(
        'width: 640px',
      )
    })

    it('resets to the default width on a double-click, forgetting the stored one too', async () => {
      const wrapper = mountPlayer(true)
      await fireDrag(wrapper, 500, 100)

      await wrapper.get('[data-test="aside-resize-handle"]').trigger('dblclick')

      expect(wrapper.get('[data-test="player-aside"]').attributes('style')).toBeFalsy()
      expect(localStorage.getItem(ASIDE_WIDTH_KEY)).toBeNull()
    })

    it('gives the video a floor so a wide aside cannot crush it away', () => {
      const wrapper = mountPlayer(true)

      expect(wrapper.get('[data-test="lesson-player"] > div').classes()).toContain('min-w-80')
    })
  })
})
