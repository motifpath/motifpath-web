import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import { useWeekLabel } from '@/features/admin/composables/useWeekLabel'
import { ALPHA_NOW } from '@/shared/testUtils/alphaObservation'

function label(week: { week_start: string; week_end: string; running: boolean }, compact = false) {
  let text = ''
  mount(
    defineComponent({
      setup() {
        text = useWeekLabel()(week, compact)
        return () => h('div')
      },
    }),
  )
  return text
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(ALPHA_NOW)
})
afterEach(() => vi.useRealTimers())

describe('useWeekLabel', () => {
  it('calls the running week this week', () => {
    expect(label({ week_start: '2026-10-12', week_end: '2026-10-18', running: true })).toBe('This week · 12–18 Oct')
  })

  it('calls the week before the running one last week', () => {
    expect(label({ week_start: '2026-10-05', week_end: '2026-10-11', running: false })).toBe('Last week · 5–11 Oct')
  })

  it('names any earlier week by its dates alone', () => {
    expect(label({ week_start: '2026-09-28', week_end: '2026-10-04', running: false })).toBe('28 Sep – 4 Oct')
  })

  it('drops the words on a phone, where the stepper is narrow', () => {
    expect(label({ week_start: '2026-10-12', week_end: '2026-10-18', running: true }, true)).toBe('12–18 Oct')
  })
})
