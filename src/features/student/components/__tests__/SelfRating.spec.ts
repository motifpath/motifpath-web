import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import SelfRating from '@/features/student/components/SelfRating.vue'

function mountRating(props: Record<string, unknown> = {}) {
  return mount(SelfRating, { props: { bpm: 72, noteValue: 'quarters', ...props }, attachTo: document.body })
}

function press(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

describe('SelfRating', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('asks how the take went at its tempo, in the action bar', () => {
    const wrapper = mountRating()

    const bar = wrapper.get('[data-test="action-bar"]')
    expect(bar.get('[data-test="rate-prompt"]').text()).toBe('How was that take at 72 BPM?')
  })

  it('names the note value of the take, when not quarters', () => {
    expect(mountRating({ bpm: 60, noteValue: 'triplets' }).get('[data-test="rate-prompt"]').text()).toBe('How was that take at 60 BPM in triplets?')
  })

  it('offers Struggled, Almost and Clean, each saying what it means', () => {
    const wrapper = mountRating()

    expect(wrapper.get('[data-test="rate-struggled"]').text()).toContain('Struggled')
    expect(wrapper.get('[data-test="rate-struggled"]').text()).toContain('Fell apart or had to stop')
    expect(wrapper.get('[data-test="rate-almost"]').text()).toContain('Almost')
    expect(wrapper.get('[data-test="rate-clean"]').text()).toContain('Clean')
    expect(wrapper.get('[data-test="rate-clean"]').text()).toContain('No slips')
  })

  it('commits the rating with one tap', async () => {
    const wrapper = mountRating()

    await wrapper.get('[data-test="rate-almost"]').trigger('click')

    expect(wrapper.emitted('rate')).toEqual([['almost']])
  })

  it('rates with keys 1 to 3', () => {
    const wrapper = mountRating()

    press('1')
    press('3')

    expect(wrapper.emitted('rate')).toEqual([['struggled'], ['clean']])
  })

  it('ignores other keys, and a key another control already took', () => {
    const wrapper = mountRating()

    press('4')
    const taken = new KeyboardEvent('keydown', { key: '2', cancelable: true })
    taken.preventDefault()
    window.dispatchEvent(taken)

    expect(wrapper.emitted('rate')).toBeUndefined()
  })

  it('stops listening for keys once gone', () => {
    const wrapper = mountRating()
    wrapper.unmount()

    press('1')

    expect(wrapper.emitted('rate')).toBeUndefined()
  })

  it('restarts without rating from a link above the tiles', async () => {
    const wrapper = mountRating()

    const restart = wrapper.get('[data-test="restart-take"]')
    expect(restart.text()).toBe('Restart without rating')
    await restart.trigger('click')

    expect(wrapper.emitted('restart')).toHaveLength(1)
    expect(wrapper.emitted('rate')).toBeUndefined()
  })

  it('shows each tile’s key on a keyboard', () => {
    const wrapper = mountRating()

    expect(wrapper.get('[data-test="rate-struggled"]').attributes('aria-keyshortcuts')).toBe('1')
    expect(wrapper.get('[data-test="rate-clean"]').attributes('aria-keyshortcuts')).toBe('3')
  })

  it('asks how a chord sounded, with no take to restart', async () => {
    const wrapper = mount(SelfRating, { props: { chord: 'D' }, attachTo: document.body })

    expect(wrapper.get('[data-test="rate-prompt"]').text()).toBe('How did D sound?')
    expect(wrapper.find('[data-test="restart-take"]').exists()).toBe(false)
    await wrapper.get('[data-test="rate-clean"]').trigger('click')
    expect(wrapper.emitted('rate')).toEqual([['clean']])
  })
})
