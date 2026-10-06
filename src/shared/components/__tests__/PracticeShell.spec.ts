import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

import PracticeShell from '@/shared/components/PracticeShell.vue'

enableAutoUnmount(afterEach)

function mountShell(props: Record<string, unknown> = {}, slot: () => unknown = () => h('p', 'Stimulus')) {
  return mount(PracticeShell, {
    attachTo: document.body,
    props: { exitLabel: 'End session', ...props },
    slots: { default: slot },
  })
}

function press(key: string, target: EventTarget = document.body) {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('PracticeShell', () => {
  it('shows what it holds under an exit, with no other navigation', () => {
    const wrapper = mountShell()

    expect(wrapper.text()).toContain('Stimulus')
    expect(wrapper.get('[data-test="shell-exit"]').attributes('aria-label')).toBe('End session')
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('exits when × is pressed', async () => {
    const wrapper = mountShell()

    await wrapper.get('[data-test="shell-exit"]').trigger('click')

    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('shows where the student is in the run, and how full each item is', () => {
    const wrapper = mountShell({ position: { current: 2, total: 3 }, progress: [1, 0.5, 0] })

    expect(wrapper.get('[data-test="shell-position"]').text()).toBe('2 / 3')
    const segments = wrapper.findAll('[data-test="session-segment"]')
    expect(segments.map((segment) => segment.attributes('data-filled'))).toEqual(['100', '50', '0'])
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('2')
  })

  it('shows no position or progress outside a run', () => {
    const wrapper = mountShell()

    expect(wrapper.find('[data-test="shell-position"]').exists()).toBe(false)
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('exits on Escape, so a keyboard or pedal can leave', () => {
    const wrapper = mountShell()

    press('Escape')

    expect(wrapper.emitted('exit')).toHaveLength(1)
  })

  it('presses the primary action on Enter or Space', () => {
    const onPrimary = vi.fn()
    mountShell({}, () => h('button', { 'data-primary-action': '', onClick: onPrimary }, 'Continue'))

    press('Enter')
    press(' ')

    expect(onPrimary).toHaveBeenCalledTimes(2)
  })

  it('leaves Enter and Space to a focused control', () => {
    const onPrimary = vi.fn()
    const wrapper = mountShell({}, () => [
      h('button', { 'data-test': 'other' }, 'Other'),
      h('button', { 'data-primary-action': '', onClick: onPrimary }, 'Continue'),
    ])

    press('Enter', wrapper.get('[data-test="other"]').element)

    expect(onPrimary).not.toHaveBeenCalled()
  })

  it('doesn’t press a disabled primary action', () => {
    const onPrimary = vi.fn()
    mountShell({}, () => h('button', { 'data-primary-action': '', disabled: true, onClick: onPrimary }, 'Check'))

    press('Enter')

    expect(onPrimary).not.toHaveBeenCalled()
  })

  it('stops listening for keys once it is gone', () => {
    const onExit = vi.fn()
    mountShell({ onExit }).unmount()

    press('Escape')

    expect(onExit).not.toHaveBeenCalled()
  })
})
