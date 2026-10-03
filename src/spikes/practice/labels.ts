/** Display text and colour classes for the spike's model values. */
import type { components } from '@/api/generated/core-domain'
import type { BlockKind, Level, Reason } from '@/spikes/practice/model'

type Diagram = components['schemas']['Diagram']
type DiagramPosition = components['schemas']['DiagramPosition']

export const LEVEL_LABEL: Record<Level, string> = {
  new: 'New',
  learning: 'Learning',
  accurate: 'Accurate',
  fluent: 'Fluent',
  retained: 'Retained',
}

export const LEVEL_CLASS: Record<Level, string> = {
  new: 'bg-surface-sunken text-ink-subtle',
  learning: 'bg-accent-muted text-ink',
  accurate: 'bg-warning-muted text-ink',
  fluent: 'bg-success-muted text-ink',
  retained: 'bg-success text-success-fg',
}

export const REASON_LABEL: Record<Reason, string> = {
  teacher_suggested: 'Suggested by your teacher',
  due: 'Fading — time to review',
  weak: 'Weak spot',
  new: 'New',
  warm_up: 'Warm-up',
  application: 'Apply it to music',
  review_ahead: 'Review ahead — keep it sharp',
  stretch: 'Stretch — you’re ready for this',
}

export const BLOCK_LABEL: Record<BlockKind, string> = {
  warm_up: 'Warm-up',
  focus: 'Focus',
  application: 'Apply it',
  mental: 'Mind practice',
}

export const percent = (v: number) => `${Math.round(v * 100)}%`
export const seconds = (ms: number | null) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`)

/** A diagram drawing only the given positions — for drills built on the bare fretboard. */
export function bareDiagram(id: string, positions: DiagramPosition[]): Diagram {
  return {
    diagram_id: id,
    instrument_id: 'instrument-guitar',
    instrument_ids: ['instrument-guitar'],
    names: { en: id },
    languages: ['en'],
    kind: 'custom',
    created_by: { user_id: 'spike', display_name: 'Spike' },
    root_note: 'C',
    label_display: 'note',
    color: null,
    mode: null,
    tempo_bpm: null,
    time_signature: { beats: 4, beat_value: 4 },
    sequence: [],
    positions,
    regions: [],
    classification: { skills: [], concepts: [] },
    created_at: '2026-10-01T00:00:00Z',
  }
}
