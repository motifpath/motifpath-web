import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TapCheck from '@/features/student/components/TapCheck.vue'

const STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

function mountCheck() {
  return mount(TapCheck, { props: { tuning: STANDARD } })
}

type Wrapper = ReturnType<typeof mountCheck>

/** The cell lit now, as string:fret; null when none is. */
function litPlace(wrapper: Wrapper): string | null {
  const lit = wrapper.find('[data-test="lit-cell"]')
  return lit.exists() ? `${lit.attributes('data-string')}:${lit.attributes('data-fret')}` : null
}

function target(wrapper: Wrapper, place: string) {
  const found = wrapper.findAll('[data-test="drill-cell"]').find((cell) => `${cell.attributes('data-string')}:${cell.attributes('data-fret')}` === place)
  if (!found) throw new Error(`no target at ${place}`)
  return found
}

/** Waits, a millisecond at a time, for the next cell to light, then taps it after `ms`. */
async function tapLitAfter(wrapper: Wrapper, ms: number) {
  for (let waited = 0; !litPlace(wrapper) && waited < 2000; waited++) await vi.advanceTimersByTimeAsync(1)
  const place = litPlace(wrapper)
  if (!place) throw new Error('no cell lit')
  await vi.advanceTimersByTimeAsync(ms)
  await target(wrapper, place).trigger('click')
}

async function start(wrapper: Wrapper) {
  await wrapper.get('[data-test="action-bar"] [data-test="start-tap-check"]').trigger('click')
}

enableAutoUnmount(afterEach)

describe('TapCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T10:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('says what the tap check is for before it starts', () => {
    const wrapper = mountCheck()

    expect(wrapper.get('h2').text()).toBe('Tap check')
    expect(wrapper.text()).toContain('20 seconds')
    expect(wrapper.get('[data-test="start-tap-check"]').attributes()).toHaveProperty('data-primary-action')
    expect(wrapper.find('[data-test="lit-cell"]').exists()).toBe(false)
  })

  it('can be skipped before it starts', async () => {
    const wrapper = mountCheck()

    await wrapper.get('[data-test="skip-tap-check"]').trigger('click')

    expect(wrapper.emitted('skip')).toEqual([[]])
  })

  it('lights frets one at a time, and moves on only when the lit one is tapped', async () => {
    const wrapper = mountCheck()
    await start(wrapper)
    await vi.advanceTimersByTimeAsync(1000)
    const first = litPlace(wrapper)
    expect(first).not.toBeNull()

    const other = wrapper.findAll('[data-test="drill-cell"]').find((cell) => `${cell.attributes('data-string')}:${cell.attributes('data-fret')}` !== first)!
    await other.trigger('click')
    expect(litPlace(wrapper)).toBe(first)

    await target(wrapper, first!).trigger('click')
    expect(litPlace(wrapper)).toBeNull()
  })

  it('completes after 20 seconds with the median tap time and the number of taps', async () => {
    const wrapper = mountCheck()
    await start(wrapper)
    await tapLitAfter(wrapper, 300)
    await tapLitAfter(wrapper, 340)
    await tapLitAfter(wrapper, 320)
    expect(wrapper.emitted('complete')).toBeUndefined()

    await vi.advanceTimersByTimeAsync(20_000)

    expect(wrapper.emitted('complete')).toEqual([[{ medianMs: 320, count: 3 }]])
  })

  it('counts as skipped when nothing was tapped in the 20 seconds', async () => {
    const wrapper = mountCheck()
    await start(wrapper)

    await vi.advanceTimersByTimeAsync(20_000)

    expect(wrapper.emitted('complete')).toBeUndefined()
    expect(wrapper.emitted('skip')).toEqual([[]])
  })

  it('can be skipped while it runs, sending nothing', async () => {
    const wrapper = mountCheck()
    await start(wrapper)
    await tapLitAfter(wrapper, 300)

    await wrapper.get('[data-test="skip-tap-check"]').trigger('click')
    await vi.advanceTimersByTimeAsync(20_000)

    expect(wrapper.emitted('skip')).toEqual([[]])
    expect(wrapper.emitted('complete')).toBeUndefined()
  })

  it('shows the seconds left while it runs', async () => {
    const wrapper = mountCheck()
    await start(wrapper)
    await vi.advanceTimersByTimeAsync(5000)

    expect(wrapper.get('[data-test="tap-check-left"]').text()).toBe('15 s left')
  })
})
