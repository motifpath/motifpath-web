import { describe, expect, it } from 'vitest'

import type { components } from '@/api/generated/core-domain'
import { planRows } from '@/features/student/utils/planRows'

type Item = components['schemas']['PracticeSessionItem']

function item(itemKey: string, kind: Item['kind']): Item {
  return { item_key: itemKey, kind, reason: 'new', rung: 'hear', node_id: null, level: 'new', estimated_seconds: 20 }
}

describe('planRows', () => {
  it('lists an item asked again later in the session once each time, each line keyed apart', () => {
    const heard = item('heard_chord:vi', 'heard_chord')
    const other = item('heard_chord:IV', 'heard_chord')

    const rows = planRows([heard, other, heard])

    expect(rows.map((row) => row.item.item_key)).toEqual(['heard_chord:vi', 'heard_chord:IV', 'heard_chord:vi'])
    expect(rows.map((row) => row.positions)).toEqual([[0], [1], [2]])
    expect(new Set(rows.map((row) => row.key)).size).toBe(3)
  })
})
