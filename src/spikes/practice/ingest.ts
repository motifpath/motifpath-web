/**
 * The server side of an answer: find the item, grade the raw response, and
 * store the result as evidence. Nothing the client says about correctness is
 * trusted; a rejected response stores nothing.
 */
import { grade } from '@/spikes/practice/graders'
import type { GradeContext, Rejection } from '@/spikes/practice/graders'
import type { Evidence, ItemAnsweredEvent, PracticeItem } from '@/spikes/practice/model'

export function ingestAnswer(
  event: ItemAnsweredEvent,
  items: PracticeItem[],
  ctx: GradeContext,
): Evidence | { rejected: Rejection | 'unknown_item' } {
  const item = items.find((i) => i.item_key === event.item_key)
  if (!item) return { rejected: 'unknown_item' }
  const result = grade(item, event.response, ctx)
  if ('rejected' in result) return result
  return {
    evidence_id: event.event_id,
    student_id: event.student_id,
    session_id: event.session_id,
    occurred_at: event.occurred_at,
    item_key: event.item_key,
    ...result.graded,
    grader: result.grader,
    response: event.response,
  }
}
