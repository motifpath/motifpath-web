import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

/** One line of today's plan: an item, or every fretboard cell or diagram shape of one drill, counted. */
export interface PlanRow {
  key: string
  /** The item, or the first cell of the drill. */
  item: Item
  /** Where in the plan the items of the line are, in order. */
  positions: number[]
  /** How many cells of the drill the session asks; absent for any other item. */
  cellCount?: number
  /** How many shapes of the drill the session asks; absent for any other item. */
  shapeCount?: number
}

/** The drill a fretboard cell or diagram shape belongs to, which its line is keyed by; null for any other item. */
function drillTemplateOf(item: Item): string | null {
  if (item.fretboard_cell) return `fretboard_cell:${item.fretboard_cell.drill}`
  if (item.diagram_shape) return `diagram_shape:${item.diagram_shape.drill}`
  return null
}

/**
 * The lines of today's plan, in session order. Fretboard cells and diagram shapes come many to a
 * session and look alike, so each drill's cells, and each drill's shapes, are one line, where its
 * first one is. An item asked again later in the session is a line each time, keyed apart.
 */
export function planRows(items: Item[]): PlanRow[] {
  const rows: PlanRow[] = []
  const drillRows = new Map<string, PlanRow>()
  const timesListed = new Map<string, number>()
  items.forEach((item, position) => {
    const template = drillTemplateOf(item)
    if (!template) {
      const times = (timesListed.get(item.item_key) ?? 0) + 1
      timesListed.set(item.item_key, times)
      rows.push({ key: times === 1 ? item.item_key : `${item.item_key}@${times}`, item, positions: [position] })
      return
    }
    const count = item.fretboard_cell ? 'cellCount' : 'shapeCount'
    const row = drillRows.get(template)
    if (row) {
      row[count] = (row[count] ?? 0) + 1
      row.positions.push(position)
      return
    }
    const first: PlanRow = { key: template, item, positions: [position], [count]: 1 }
    drillRows.set(template, first)
    rows.push(first)
  })
  return rows
}
