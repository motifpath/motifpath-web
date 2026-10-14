import type { components } from '@/api/generated/core-domain'
import type { components as eventComponents } from '@/api/generated/event-ingestion'

type AlphaStudent = components['schemas']['AlphaStudent']
type AlphaObservation = components['schemas']['AlphaObservation']
type AlphaStudentObservation = components['schemas']['AlphaStudentObservation']
type AlphaSession = components['schemas']['AlphaSession']
type AlphaPathNode = components['schemas']['AlphaPathNode']
type LoggedEvent = eventComponents['schemas']['LoggedEvent']

/** Wednesday 14 Oct 2026, 12:00 in São Paulo: the running week is 12–18 Oct. */
export const ALPHA_NOW = new Date('2026-10-14T15:00:00Z')

export function makeAlphaStudent(overrides: Partial<AlphaStudent> = {}): AlphaStudent {
  return {
    student_id: '00000000-0000-4000-8000-0000000000c1',
    display_name: 'Camila Duarte',
    registered_at: '2026-09-21T12:00:00Z',
    finished_sessions_in_week: 2,
    at_target_in_week: false,
    weeks_so_far: [
      { week_start: '2026-09-21', finished_sessions: 3 },
      { week_start: '2026-09-28', finished_sessions: 4 },
      { week_start: '2026-10-05', finished_sessions: 3 },
    ],
    weeks_so_far_count: 3,
    weeks_at_target_count: 3,
    at_target_every_week: true,
    last_active_at: '2026-10-14T10:51:00Z',
    quiet: false,
    first_path: {
      student_path_id: '00000000-0000-4000-8000-0000000000p1',
      title: 'Guitar foundations',
      given_at: '2026-09-21T12:00:00Z',
      completed_nodes: 11,
      total_nodes: 18,
      completed_percent: 61,
      over_target: false,
    },
    ...overrides,
  }
}

export function makeAlphaObservation(overrides: Partial<AlphaObservation> = {}): AlphaObservation {
  return {
    week: { week_start: '2026-10-12', week_end: '2026-10-18', running: true },
    summary: {
      student_count: 1,
      at_target_in_week: 0,
      at_target_in_previous_week: 1,
      at_target_every_week: 1,
      first_path_over_target: 0,
      median_first_path_percent: 61,
    },
    students: [makeAlphaStudent()],
    ...overrides,
  }
}

export function makeAlphaSession(overrides: Partial<AlphaSession> = {}): AlphaSession {
  return {
    practice_session_id: '7f3c9a10-0000-4000-8000-000000000001',
    started_at: '2026-10-14T10:40:00Z',
    planned_minutes: 10,
    ended_at: '2026-10-14T10:51:00Z',
    state: 'finished',
    items_answered: 9,
    ...overrides,
  }
}

export function makeAlphaPathNode(overrides: Partial<AlphaPathNode> = {}): AlphaPathNode {
  return {
    position: 1,
    content_node_id: '00000000-0000-4000-8000-0000000000n1',
    title: 'Holding the guitar',
    status: 'completed',
    completed_at: '2026-09-22T12:00:00Z',
    started_at: '2026-09-21T12:00:00Z',
    ...overrides,
  }
}

export function makeAlphaStudentObservation(overrides: Partial<AlphaStudentObservation> = {}): AlphaStudentObservation {
  return {
    week: { week_start: '2026-10-12', week_end: '2026-10-18', running: true },
    student: makeAlphaStudent(),
    session_weeks: [
      {
        week: { week_start: '2026-10-12', week_end: '2026-10-18', running: true },
        finished_sessions: 2,
        sessions: [
          makeAlphaSession(),
          makeAlphaSession({
            practice_session_id: '2a91bb00-0000-4000-8000-000000000002',
            started_at: '2026-10-13T22:05:00Z',
            ended_at: '2026-10-13T22:09:00Z',
            state: 'ended_early',
            items_answered: 3,
          }),
          makeAlphaSession({
            practice_session_id: 'c04e1200-0000-4000-8000-000000000003',
            started_at: '2026-10-13T21:30:00Z',
            planned_minutes: 15,
            ended_at: '2026-10-13T21:45:00Z',
            items_answered: 12,
          }),
        ],
      },
      {
        week: { week_start: '2026-10-05', week_end: '2026-10-11', running: false },
        finished_sessions: 1,
        sessions: [makeAlphaSession({ practice_session_id: 'd0000000-0000-4000-8000-000000000004', started_at: '2026-10-11T13:12:00Z', ended_at: '2026-10-11T13:22:00Z' })],
      },
    ],
    first_path_nodes: [
      makeAlphaPathNode(),
      makeAlphaPathNode({
        position: 2,
        content_node_id: '00000000-0000-4000-8000-0000000000n2',
        title: 'Changing G → D',
        status: 'in_progress',
        completed_at: null,
        started_at: '2026-10-14T10:00:00Z',
      }),
      makeAlphaPathNode({
        position: 3,
        content_node_id: '00000000-0000-4000-8000-0000000000n3',
        title: 'Palm muting',
        status: 'not_started',
        completed_at: null,
        started_at: null,
      }),
    ],
    ...overrides,
  }
}

export function makeLoggedEvent(overrides: Partial<LoggedEvent> = {}): LoggedEvent {
  return {
    received_at: '2026-10-14T10:51:12Z',
    event: {
      event_id: 'e-1',
      student_id: '00000000-0000-4000-8000-0000000000c1',
      session_id: 'browser-1',
      occurred_at: '2026-10-14T10:51:10Z',
      event_type: 'practice.session_ended',
      practice_session_id: '7f3c9a10-0000-4000-8000-000000000001',
      answered_count: 9,
      left_early: false,
      felt_ratings: [],
    },
    ...overrides,
  }
}
