/**
 * The rules the engagement screens apply on top of what the alpha observation API returns: how far a
 * student is from the weekly target, how weeks and last activity read, which students a filter or
 * a search keeps, and how a raw tracking event is summed up in one line.
 */
import type { components } from '@/api/generated/core-domain'
import type { components as eventComponents, operations } from '@/api/generated/event-ingestion'

type AlphaStudent = components['schemas']['AlphaStudent']
type AlphaWeekRange = components['schemas']['AlphaWeekRange']
type TrackingEvent = eventComponents['schemas']['TrackingEvent']
type EventType = TrackingEvent['event_type']
export type EventTypeGroup = NonNullable<NonNullable<operations['listLoggedEvents']['parameters']['query']>['type_group']>

/** Counted sessions a week that put a student at the target. */
export const WEEKLY_TARGET = 3

/** Every week is read in the alpha's own time zone, whatever the viewer's. */
const ALPHA_TIME_ZONE = 'America/Sao_Paulo'

const DAY_MS = 24 * 60 * 60 * 1000

export type WeekChip = { kind: 'none' } | { kind: 'toGo'; remaining: number } | { kind: 'onTarget' }

export function weekChip(countedSessions: number): WeekChip {
  if (countedSessions >= WEEKLY_TARGET) return { kind: 'onTarget' }
  if (countedSessions === 0) return { kind: 'none' }
  return { kind: 'toGo', remaining: WEEKLY_TARGET - countedSessions }
}

/** The Monday `weeks` weeks away from the Monday given, both as `YYYY-MM-DD` calendar dates. */
export function shiftWeek(weekStart: string, weeks: number): string {
  return new Date(dateAtUtcMidnight(weekStart) + weeks * 7 * DAY_MS).toISOString().slice(0, 10)
}

/** "12–18 Oct", or "28 Sep – 4 Oct" when the week runs into the next month. */
export function weekRange(week: Pick<AlphaWeekRange, 'week_start' | 'week_end'>, locale: string): string {
  const monthOf = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' })
  const start = new Date(dateAtUtcMidnight(week.week_start))
  const end = new Date(dateAtUtcMidnight(week.week_end))
  const startMonth = monthOf.format(start)
  const endMonth = monthOf.format(end)
  if (startMonth === endMonth) return `${start.getUTCDate()}–${end.getUTCDate()} ${endMonth}`
  return `${start.getUTCDate()} ${startMonth} – ${end.getUTCDate()} ${endMonth}`
}

export type LastActive = { kind: 'none' } | { kind: 'today'; time: string } | { kind: 'daysAgo'; days: number }

/** How long ago a student was last active, in whole São Paulo calendar days. */
export function lastActive(lastActiveAt: string | null, now: Date): LastActive {
  if (lastActiveAt === null) return { kind: 'none' }
  const at = new Date(lastActiveAt)
  const days = Math.round((dateAtUtcMidnight(alphaDate(now)) - dateAtUtcMidnight(alphaDate(at))) / DAY_MS)
  if (days <= 0) return { kind: 'today', time: alphaTime(at) }
  return { kind: 'daysAgo', days }
}

/** A name matches when it contains the query, ignoring case and accents; a blank query matches all. */
export function matchesStudentSearch(name: string, query: string): boolean {
  const wanted = foldForSearch(query.trim())
  return wanted === '' || foldForSearch(name).includes(wanted)
}

export type StudentFilter = 'all' | 'belowTarget' | 'quiet'

export function passesFilter(student: AlphaStudent, filter: StudentFilter): boolean {
  if (filter === 'belowTarget') return !student.at_target_in_week
  if (filter === 'quiet') return student.quiet
  return true
}

/** Each filter's count over every student, so the chips keep their numbers whichever one is picked. */
export function filterCounts(students: AlphaStudent[]): Record<StudentFilter, number> {
  return {
    all: students.length,
    belowTarget: students.filter((s) => passesFilter(s, 'belowTarget')).length,
    quiet: students.filter((s) => passesFilter(s, 'quiet')).length,
  }
}

const EVENT_TYPES_BY_GROUP: Record<EventTypeGroup, EventType[]> = {
  practice_sessions: ['practice.session_started', 'practice.session_ended'],
  answers: ['practice.item_answered', 'practice.tap_check_completed'],
  lessons: ['lesson.started', 'lesson.resumed', 'lesson.completed'],
  exercises: ['exercise.started', 'exercise.progress', 'exercise.ended'],
  song_charts: ['song_chart.opened', 'song_chart.chord_viewed', 'song_chart.completed'],
}

/** The type groups in the order the event filter offers them. */
export const EVENT_TYPE_GROUPS: EventTypeGroup[] = ['practice_sessions', 'answers', 'lessons', 'exercises', 'song_charts']

export function eventTypesOf(group: EventTypeGroup): EventType[] {
  return EVENT_TYPES_BY_GROUP[group]
}

/** One piece of an event's details line; the screen turns `key` into words. */
export interface EventDetail {
  key: string
  params: Record<string, string | number>
}

/** The details line of a raw event, from the event's own fields only. */
export function eventDetails(event: TrackingEvent): EventDetail[] {
  switch (event.event_type) {
    case 'practice.session_started':
      return [detail('session', { id: shortId(event.practice_session_id) }), detail('minutesPlanned', { minutes: event.minutes })]
    case 'practice.session_ended':
      return [
        detail('session', { id: shortId(event.practice_session_id) }),
        detail(event.left_early ? 'leftEarly' : 'notLeftEarly'),
        detail('itemsAnswered', { count: event.answered_count }),
      ]
    case 'practice.item_answered': {
      const parts = [detail('responseType', { type: event.response.response_type })]
      if ('latency_ms' in event.response) parts.push(detail('seconds', { seconds: (event.response.latency_ms / 1000).toFixed(1) }))
      return parts
    }
    case 'practice.tap_check_completed':
      return [detail('medianTap', { ms: event.median_tap_ms }), detail('taps', { count: event.tap_count })]
    case 'lesson.started':
    case 'lesson.resumed':
    case 'lesson.completed':
      return lessonDetails(event)
    case 'exercise.started':
    case 'exercise.progress':
    case 'exercise.ended':
      return exerciseDetails(event)
    case 'song_chart.opened':
    case 'song_chart.chord_viewed':
    case 'song_chart.completed':
      return songChartDetails(event)
  }
}

type LessonEvent = Extract<TrackingEvent, { event_type: 'lesson.started' | 'lesson.resumed' | 'lesson.completed' }>
type ExerciseEvent = Extract<TrackingEvent, { event_type: 'exercise.started' | 'exercise.progress' | 'exercise.ended' }>
type SongChartEvent = Extract<TrackingEvent, { event_type: 'song_chart.opened' | 'song_chart.chord_viewed' | 'song_chart.completed' }>

function lessonDetails(event: LessonEvent): EventDetail[] {
  const parts = [detail('node', { id: shortId(event.content_context.content_node_id) })]
  if (event.content_context.content_type) parts.push(detail('contentType', { type: event.content_context.content_type }))
  if (event.event_type === 'lesson.completed' && event.duration_seconds !== undefined) {
    parts.push(detail('duration', { minutes: Math.floor(event.duration_seconds / 60), seconds: event.duration_seconds % 60 }))
  }
  return parts
}

function exerciseDetails(event: ExerciseEvent): EventDetail[] {
  const parts = [detail('exercise', { id: shortId(event.exercise_id) }), detail('source', { source: event.trigger_context.source })]
  if (event.event_type === 'exercise.progress' && event.elapsed_seconds !== undefined) {
    parts.push(detail('elapsed', { seconds: event.elapsed_seconds }))
  }
  if (event.event_type === 'exercise.ended') {
    parts.push(detail('outcome', { outcome: event.outcome }))
    if (event.final_score !== undefined) parts.push(detail('score', { score: event.final_score }))
  }
  return parts
}

function songChartDetails(event: SongChartEvent): EventDetail[] {
  const context = event.song_chart_context
  const parts = [detail('songChart', { id: shortId(context.song_chart_id), revision: context.revision_number })]
  if (event.event_type === 'song_chart.chord_viewed') parts.push(detail('chordSource', { source: event.source }))
  return parts
}

function detail(key: string, params: Record<string, string | number> = {}): EventDetail {
  return { key, params }
}

/** The first block of a UUID: enough to tell events apart on one screen. */
function shortId(id: string): string {
  return id.split('-')[0] ?? id
}

function dateAtUtcMidnight(isoDate: string): number {
  const [year, month, day] = isoDate.split('-').map(Number)
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function alphaDate(at: Date): string {
  // en-CA formats a date as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: ALPHA_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

function alphaTime(at: Date): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: ALPHA_TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}

function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
}
