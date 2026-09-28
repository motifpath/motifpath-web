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
 * Reads the diagram reference an embed point carries: an `ExpandedContent`
 * item's `diagram_ref` / `diagram_stack_ref`, or a `diagram` PromptNode's
 * `diagramRef` / `diagramStackRef` attrs (camelCase, like every other node
 * attr). Both are unchecked input — a node's attrs are deliberately loose —
 * so anything malformed yields null, and the student sees nothing rather
 * than a broken diagram. A present ref wins over a stack.
 */
export function parseDiagramEmbed(diagramRef: unknown, diagramStackRef: unknown): DiagramEmbed | null {
  if (diagramRef !== undefined && diagramRef !== null) {
    return isDiagramRef(diagramRef) ? { kind: 'single', ref: diagramRef } : null
  }

  if (!isRecord(diagramStackRef)) return null
  const { stack } = diagramStackRef
  if (!Array.isArray(stack) || stack.length < 2 || !stack.every(isDiagramRef)) return null
  return { kind: 'stack', stack }
}
