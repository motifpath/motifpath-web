import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'

import CuePanel from '@/features/student/components/CuePanel.vue'
import { makeTimedCue } from '@/features/student/testing/expandedContent'
import { plainTextPrompt } from '@/shared/testUtils/promptDocument'
import type { components } from '@/api/generated/core-domain'

type ExpandedContent = components['schemas']['ExpandedContent']

function imageCue(overrides: Partial<ExpandedContent> = {}): ExpandedContent {
  return { ...makeTimedCue('a', 2, 4), ...overrides }
}

/** A copy of the cue with one of its optional fields removed. */
function cueWithout(cue: ExpandedContent, field: 'media_url' | 'rich_content'): ExpandedContent {
  const copy = { ...cue }
  delete copy[field]
  return copy
}

function richTextCue(text: string, overrides: Partial<ExpandedContent> = {}): ExpandedContent {
  const base = cueWithout(makeTimedCue('r', 2, 4), 'media_url')
  return { ...base, content_type: 'rich_text', rich_content: plainTextPrompt(text), ...overrides }
}

function mountCue(cue: ExpandedContent) {
  return mount(CuePanel, { props: { cue } })
}

describe('CuePanel', () => {
  describe('an image or GIF cue', () => {
    it.each(['image', 'gif'] as const)('shows the %s', (contentType) => {
      const wrapper = mountCue(
        imageCue({ content_type: contentType, media_url: 'https://cdn.example.test/cue.png' }),
      )

      expect(wrapper.get('img').attributes('src')).toBe('https://cdn.example.test/cue.png')
    })

    it.each([
      'javascript:alert(1)',
      'ftp://example.test/cue.png',
      '/relative/cue.png',
      'not a url',
    ])('shows nothing for the unsafe address %s', (unsafe) => {
      const wrapper = mountCue(imageCue({ media_url: unsafe }))

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('shows nothing when the cue has no address', () => {
      const wrapper = mountCue(cueWithout(imageCue(), 'media_url'))

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('shows the caption under the picture', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.get('figcaption').text()).toBe('A C major triad')
    })

    it('has no caption element when the cue has none', () => {
      const wrapper = mountCue(imageCue())

      expect(wrapper.find('figcaption').exists()).toBe(false)
    })

    it('treats the picture as decorative, since the caption already says what it shows', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.get('img').attributes('alt')).toBe('')
    })
  })

  describe('a rich-text cue', () => {
    it('shows the text', () => {
      const wrapper = mountCue(richTextCue('Keep your wrist relaxed.'))

      expect(wrapper.text()).toContain('Keep your wrist relaxed.')
    })

    it('shows the caption too when there is one', () => {
      const wrapper = mountCue(richTextCue('Keep your wrist relaxed.', { caption: 'Tip' }))

      expect(wrapper.get('figcaption').text()).toBe('Tip')
    })

    it('shows nothing when the cue has no text', () => {
      const wrapper = mountCue(cueWithout(richTextCue('x'), 'rich_content'))

      expect(wrapper.text()).toBe('')
    })
  })

  describe('layout', () => {
    it('adds no heading or label of its own, so it reads as part of the lesson', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.find('h1, h2, h3, h4, h5, h6, legend').exists()).toBe(false)
    })

    it('uses no inline styles', () => {
      const wrapper = mountCue(imageCue({ caption: 'A C major triad' }))

      expect(wrapper.find('[style]').exists()).toBe(false)
    })
  })
})
