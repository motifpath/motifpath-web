import type { components } from '@/api/generated/core-domain'

type DiagramRef = components['schemas']['DiagramRef']

/** What a cue or an inline `diagram` node embeds: one diagram, or a stack composited into one view. */
export type DiagramEmbed = { kind: 'single'; ref: DiagramRef } | { kind: 'stack'; stack: DiagramRef[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Absent, null, or a list of interval names: anything else would break the subset filtering. */
function isSubset(value: unknown): boolean {
  return value === undefined || value === null || (Array.isArray(value) && value.every((v) => typeof v === 'string'))
}

function isDiagramRef(value: unknown): value is DiagramRef {
  if (!isRecord(value)) return false
  const { diagram_id: diagramId, layers } = value
  return (
    typeof diagramId === 'string' &&
    diagramId !== '' &&
    isRecord(layers) &&
    typeof layers.intervals === 'boolean' &&
    isSubset(layers.subset)
  )
}

/**
 * Reads the `diagram_ref` / `diagram_stack_ref` an `ExpandedContent` item or
 * a `diagram` PromptNode's (deliberately loose) `attrs` carries. Anything
 * malformed yields null, so the student sees nothing rather than a broken
 * diagram.
 */
export function parseDiagramEmbed(source: Record<string, unknown> | null | undefined): DiagramEmbed | null {
  if (!source) return null

  if (source.diagram_ref !== undefined && source.diagram_ref !== null) {
    return isDiagramRef(source.diagram_ref) ? { kind: 'single', ref: source.diagram_ref } : null
  }

  const stackRef = source.diagram_stack_ref
  if (!isRecord(stackRef)) return null
  const { stack } = stackRef
  if (!Array.isArray(stack) || stack.length < 2 || !stack.every(isDiagramRef)) return null
  return { kind: 'stack', stack }
}
