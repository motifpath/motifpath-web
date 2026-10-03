/**
 * How long a teacher's note steers sessions. A suggested item or a node to work
 * on stays open until the student has practised it since the note and it shows
 * the level the teacher asked for, or the teacher closes the note. A safety
 * expiry stops a forgotten note from steering forever.
 */
import { atLeast, itemsUnder, nodeLevel } from '@/spikes/practice/graph'
import type { GraphNode, KnowledgeState, PracticeItem, TeacherNote } from '@/spikes/practice/model'

const DAY_MS = 86_400_000
export const SUGGESTION_SAFETY_DAYS = 30

export interface SuggestionContext {
  nodes: GraphNode[]
  items: PracticeItem[]
  states: Map<string, KnowledgeState>
  now: Date
}

export interface OpenSuggestions {
  item_keys: string[]
  node_ids: string[]
}

function practisedSince(state: KnowledgeState | undefined, since: string): boolean {
  return state?.last_seen_at != null && Date.parse(state.last_seen_at) > Date.parse(since)
}

export function isLive(note: TeacherNote, now: Date): boolean {
  return note.closed_at === null && now.getTime() - Date.parse(note.created_at) <= SUGGESTION_SAFETY_DAYS * DAY_MS
}

export function openSuggestions(notes: TeacherNote[], ctx: SuggestionContext): OpenSuggestions {
  const items = new Set<string>()
  const nodes = new Set<string>()
  for (const note of notes.filter((n) => isLive(n, ctx.now))) {
    for (const key of note.suggested_item_keys) {
      const state = ctx.states.get(key)
      const met = practisedSince(state, note.created_at) && atLeast(state!.effective_level, note.target_level)
      if (!met) items.add(key)
    }
    for (const id of [...note.needs_work.skill_ids, ...note.needs_work.concept_ids]) {
      const practised = itemsUnder(ctx.nodes, ctx.items, id).some((i) =>
        practisedSince(ctx.states.get(i.item_key), note.created_at),
      )
      const met = practised && atLeast(nodeLevel(ctx.nodes, ctx.items, ctx.states, id), note.target_level)
      if (!met) nodes.add(id)
    }
  }
  return { item_keys: [...items], node_ids: [...nodes] }
}
