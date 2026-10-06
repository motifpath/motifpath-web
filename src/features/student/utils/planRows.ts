import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

/** One line of today's plan: an item, or every fretboard cell of one drill, counted. */
export interface PlanRow {
  key: string
  /** The item, or the first cell of the drill. */
  item: Item
  /** How many cells of the drill the session asks; absent for any other item. */
  cellCount?: number
}

/**
 * The lines of today's plan, in session order. Fretboard cells come many to a session and look
 * alike, so each drill's cells are one line, where its first cell is.
 */
export function planRows(items: Item[]): PlanRow[] {
  const rows: PlanRow[] = []
  const drillRows = new Map<string, PlanRow>()
  for (const item of items) {
    const drill = item.fretboard_cell?.drill
    if (!drill) {
      rows.push({ key: item.item_key, item })
      continue
    }
    const row = drillRows.get(drill)
    if (row) {
      row.cellCount = (row.cellCount ?? 0) + 1
      continue
    }
    const first: PlanRow = { key: `fretboard_cell:${drill}`, item, cellCount: 1 }
    drillRows.set(drill, first)
    rows.push(first)
  }
  return rows
}
