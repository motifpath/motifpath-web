import type { components } from '@/api/generated/core-domain'

type Item = components['schemas']['PracticeSessionItem']

/** One line of today's plan: an item, or every fretboard cell or diagram shape of one drill, counted. */
export interface PlanRow {
  key: string
  /** The item, or the first cell of the drill. */
  item: Item
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

/** The key of the plan line an item is listed on. */
export function planRowKeyOf(item: Item): string {
  return drillTemplateOf(item) ?? item.item_key
}

/**
 * The lines of today's plan, in session order. Fretboard cells and diagram shapes come many to a
 * session and look alike, so each drill's cells, and each drill's shapes, are one line, where its
 * first one is.
 */
export function planRows(items: Item[]): PlanRow[] {
  const rows: PlanRow[] = []
  const drillRows = new Map<string, PlanRow>()
  for (const item of items) {
    const template = drillTemplateOf(item)
    if (!template) {
      rows.push({ key: item.item_key, item })
      continue
    }
    const count = item.fretboard_cell ? 'cellCount' : 'shapeCount'
    const row = drillRows.get(template)
    if (row) {
      row[count] = (row[count] ?? 0) + 1
      continue
    }
    const first: PlanRow = { key: template, item, [count]: 1 }
    drillRows.set(template, first)
    rows.push(first)
  }
  return rows
}
