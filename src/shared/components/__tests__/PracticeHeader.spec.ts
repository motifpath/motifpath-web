import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PracticeHeader from '@/shared/components/PracticeHeader.vue'

function mountHeader(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(PracticeHeader, { props: { exitLabel: 'End session', ...props }, slots })
}

describe('PracticeHeader', () => {
  it('names what × does', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('[data-test="shell-exit"]').attributes('aria-label')).toBe('End session')
  })

  it('exits when × is pressed', async () => {
    const wrapper = mountHeader()

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows where the student is in the run, one segment per item filled as far as it went', () => {
    const wrapper = mountHeader({ position: { current: 2, total: 3 }, progress: [1, 0.5, 0] })

    expect(wrapper.get('[data-test="shell-position"]').text()).toBe('2 / 3')
    const segments = wrapper.findAll('[data-test="session-segment"]')
    expect(segments.map((segment) => segment.attributes('data-filled'))).toEqual(['100', '50', '0'])
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuemax')).toBe('3')
  })

  it('shows only × outside a run', () => {
    const wrapper = mountHeader()

    expect(wrapper.find('[data-test="shell-position"]').exists()).toBe(false)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('gives × a 48 px touch target', () => {
    const wrapper = mountHeader()

    expect(wrapper.get('[data-test="shell-exit"]').classes()).toEqual(expect.arrayContaining(['h-12', 'w-12']))
  })

  it('holds the options a screen offers, across from ×', () => {
    const wrapper = mountHeader({}, { options: '<button data-test="tools">Tools</button>' })

    expect(wrapper.get('[data-test="shell-options"] [data-test="tools"]').text()).toBe('Tools')
  })

  it('leaves the options slot empty when a screen offers none', () => {
    expect(mountHeader().find('[data-test="shell-options"]').exists()).toBe(false)
  })

  it('heads a page pushed inside the shell with its name and an arrow back instead of ×', async () => {
    const wrapper = mountHeader({ exitLabel: 'Back to practice', title: 'Metronome' })

    expect(wrapper.get('h1').text()).toBe('Metronome')
    const back = wrapper.get('[data-test="shell-exit"]')
    expect(back.attributes('aria-label')).toBe('Back to practice')
    expect(back.find('.lucide-arrow-left').exists()).toBe(true)
    await back.trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })
})
