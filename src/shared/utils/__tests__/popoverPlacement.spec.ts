import { describe, expect, it } from 'vitest'

import { popoverPlacement } from '@/shared/utils/popoverPlacement'

const viewport = { viewportWidth: 390, viewportHeight: 800 }
const anchor = { left: 40, top: 100, bottom: 144 }

describe('popoverPlacement', () => {
  it("opens just below its anchor, aligned with the anchor's left edge", () => {
    expect(popoverPlacement({ anchor, width: 200, height: 120, ...viewport })).toEqual({ left: 40, top: 148 })
  })

  it('stays inside the screen when its anchor is near the right edge', () => {
    const placement = popoverPlacement({ anchor: { ...anchor, left: 300 }, width: 288, height: 120, ...viewport })

    expect(placement.left + 288).toBeLessThanOrEqual(390 - 8)
  })

  it('never starts left of the screen', () => {
    expect(popoverPlacement({ anchor: { ...anchor, left: -30 }, width: 200, height: 120, ...viewport }).left).toBe(8)
  })

  it('opens above its anchor when there is no room below but there is above', () => {
    const low = { left: 40, top: 700, bottom: 744 }

    expect(popoverPlacement({ anchor: low, width: 200, height: 120, ...viewport }).top).toBe(700 - 4 - 120)
  })

  it('stays below when there is room on neither side, so its top is never cut off', () => {
    const cramped = { left: 40, top: 60, bottom: 104 }

    expect(popoverPlacement({ anchor: cramped, width: 200, height: 760, ...viewport }).top).toBe(108)
  })
})
