import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import NextUpCard from '@/features/student/components/NextUpCard.vue'

function mountCard(props: Record<string, unknown> = {}) {
  return mount(NextUpCard, {
    props: {
      doneLabel: 'A Major pentatonic — Box 4',
      fastestBpm: 300,
      fastestNoteValue: 'quarters' as const,
      nextLabel: 'Ab Major pentatonic — Box 1',
      nextReason: 'stretch' as const,
      ...props,
    },
  })
}

describe('NextUpCard', () => {
  it('says what was just played and how fast', () => {
    expect(mountCard().get('[data-test="next-up-done"]').text()).toBe('You played A Major pentatonic — Box 4 up to 300 BPM.')
  })

  it('says the note value it was played at, when not quarters', () => {
    expect(mountCard({ fastestBpm: 80, fastestNoteValue: 'eighths' }).get('[data-test="next-up-done"]').text()).toBe(
      'You played A Major pentatonic — Box 4 up to 80 BPM in eighths.',
    )
  })

  it('names what comes next and why it was picked', () => {
    const wrapper = mountCard()

    expect(wrapper.get('[data-test="next-up-name"]').text()).toBe('Ab Major pentatonic — Box 1')
    expect(wrapper.get('[data-test="next-up-reason"]').text()).toBe('A step further')
  })

  it('moves on only when the student continues', async () => {
    const wrapper = mountCard()
    const next = wrapper.get('[data-test="action-bar"] [data-test="next-up-continue"]')
    expect(next.attributes()).toHaveProperty('data-primary-action')

    await next.trigger('click')

    expect(wrapper.emitted('continue')).toEqual([[]])
  })
})
