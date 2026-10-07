/**
 * Diagram shapes as a practice drill asks them: name which member of its family a shape is, or
 * find a degree asked on it. Grades exactly as the server does, so instant feedback never
 * contradicts the record: a named shape must be one of the family's members, and a degree is
 * found only by tapping one of the shape's own positions of that degree; the same pitch elsewhere
 * on the board is wrong. The root is shown, so it's never asked.
 */
import type { components } from '@/api/generated/event-ingestion'
import type { CellPlace } from '@/shared/utils/fretboardCell'

type NameTheShape = components['schemas']['NameTheShapeResponse']
type FindTheDegree = components['schemas']['FindTheDegreeResponse']

/** One marker of a shape: its place and its interval from the root. */
export interface ShapePosition extends CellPlace {
  interval: string
}

/** What grading a shape needs: the member it is, its family's members, and its positions. */
export interface ShapeReference {
  shape: string
  members: string[]
  positions: ShapePosition[]
  /** How many strings the shape's instrument has; a tap off them is no answer. */
  stringCount: number
}

/** What the student answered, before it's timed. */
export type ShapeAnswer = Pick<NameTheShape, 'response_type' | 'shape'> | Pick<FindTheDegree, 'response_type' | 'interval' | 'string' | 'fret'>

/** An answer to grade, its degree any interval name. */
export type GradableShapeAnswer =
  | Pick<NameTheShape, 'response_type' | 'shape'>
  | (Pick<FindTheDegree, 'response_type' | 'string' | 'fret'> & { interval: string })

/** Every position of the degree in the shape, in the diagram's order. */
export function cellsOfDegree(positions: ShapePosition[], interval: string): CellPlace[] {
  return positions.filter((position) => position.interval === interval).map(({ string, fret }) => ({ string, fret }))
}

/**
 * Whether the answer is right for the shape; null when it isn't an answer to it: a shape its
 * family doesn't have, the root or a degree the shape lacks, or a tap off the instrument.
 */
export function gradeDiagramShape(reference: ShapeReference, answer: GradableShapeAnswer): boolean | null {
  if (answer.response_type === 'name_the_shape') {
    return reference.members.includes(answer.shape) ? answer.shape === reference.shape : null
  }
  if (answer.interval === 'R') return null
  const cells = cellsOfDegree(reference.positions, answer.interval)
  if (cells.length === 0) return null
  if (answer.string < 1 || answer.string > reference.stringCount || answer.fret < 0) return null
  return cells.some((cell) => cell.string === answer.string && cell.fret === answer.fret)
}
