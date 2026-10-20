import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ChangeTimer from '@/shared/components/ChangeTimer.vue'

type Props = { remainingMs: number; totalMs: number; running: boolean; detail?: string }

function mountTimer(props: Partial<Props> = {}) {
  return mount(ChangeTimer, { props: { remainingMs: 42_000, totalMs: 60_000, running: true, detail: 'change on every beat', ...props } })
}

describe('ChangeTimer', () => {
  it('shows the time left in minutes and seconds, and of how long', () => {
    const wrapper = mountTimer()

    expect(wrapper.get('[data-test="timer-time"]').text()).toBe('0:42')
    expect(wrapper.get('[data-test="timer-caption"]').text()).toBe('left of 1:00 · change on every beat')
  })

  it('rounds the time left up, so it reads 0:00 only once the time is up', () => {
    expect(mountTimer({ remainingMs: 400 }).get('[data-test="timer-time"]').text()).toBe('0:01')
    expect(mountTimer({ remainingMs: 0 }).get('[data-test="timer-time"]').text()).toBe('0:00')
  })

  it('before the start, shows the whole time and that a bar of count-in comes first', () => {
    const wrapper = mountTimer({ running: false, remainingMs: 60_000 })

    expect(wrapper.get('[data-test="timer-time"]').text()).toBe('1:00')
    expect(wrapper.get('[data-test="timer-caption"]').text()).toBe('starts after a bar of count-in · change on every beat')
  })

  it('leaves the detail out when there is none', () => {
    expect(mountTimer({ detail: undefined }).get('[data-test="timer-caption"]').text()).toBe('left of 1:00')
  })

  it('fills its track with the time gone', () => {
    const track = mountTimer({ remainingMs: 45_000 }).get('[role="progressbar"]')

    expect(track.attributes()).toMatchObject({ 'aria-valuenow': '15', 'aria-valuemin': '0', 'aria-valuemax': '60' })
    expect(track.get('[data-test="timer-elapsed"]').attributes('style')).toContain('width: 25%')
  })

  it('reads the time as a timer, announced only when asked, so it never talks over the playing', () => {
    const time = mountTimer().get('[role="timer"]')

    expect(time.attributes('aria-live')).toBe('off')
  })
})
