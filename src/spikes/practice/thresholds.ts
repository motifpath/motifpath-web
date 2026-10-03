/**
 * Fluency thresholds for timed drills, as versioned reference data. A threshold
 * is the time spent *knowing* (latency minus the student's tap time) at which a
 * correct answer counts as fully fluent. The first version comes from the team's
 * own times; later versions are calibrated from students' times and from how the
 * drill felt to them. Each answer is judged by the version in force when it
 * happened, so a recalibration never takes back what was earned.
 */
import type {
  Evidence,
  Felt,
  FeltRating,
  PracticeItem,
  PracticeResponse,
} from '@/spikes/practice/model'

export interface Threshold {
  /** Which drill it times, e.g. `fretboard_cell:name_the_note` or `exercise:<id>`. */
  template: string
  version: number
  effective_from: string
  fluent_ms: number
  source: 'benchmark' | 'calibrated'
  /** The data behind a calibrated version. */
  sessions: number
  students: number
}

/** Every version of every template's threshold. */
export type ThresholdBook = Threshold[]

/** The team's times on a drill, for the first version. */
export interface Benchmark {
  template: string
  latencies_ms: number[]
  tap_ms: number
}

/** One session's evidence on one template, with how it felt. */
export interface SessionObservation {
  template: string
  student_id: string
  session_id: string
  median_net_ms: number
  felt: Felt
}

/** Fluent is this many times the team's net time: they know the drill cold. */
export const BENCHMARK_FACTOR = 2
const MIN_TAPS = 3
/** Calibration waits for this much data before it moves the threshold at all. */
export const MIN_SESSIONS = 20
export const MIN_STUDENTS = 5
/** The prior counts as this many sessions when blending with the data. */
export const PRIOR_WEIGHT_SESSIONS = 10
/** A student counts as knowing a drill at this accuracy. */
const KNOWER_ACCURACY = 0.9

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/** The drill an answer times; null for tempo-measured items, which have musical targets instead. */
export function templateOf(item: PracticeItem, response: PracticeResponse): string | null {
  if (
    item.kind === 'fretboard_cell' &&
    (response.kind === 'name_the_note' || response.kind === 'find_the_note')
  )
    return `fretboard_cell:${response.kind}`
  if (item.kind === 'exercise') return `exercise:${item.exercise_id}`
  return null
}

export function benchmarkThresholds(benchmarks: Benchmark[], effective_from: string): Threshold[] {
  return benchmarks.map((b) => ({
    template: b.template,
    version: 1,
    effective_from,
    fluent_ms: BENCHMARK_FACTOR * Math.max(1, median(b.latencies_ms)! - b.tap_ms),
    source: 'benchmark',
    sessions: 0,
    students: 0,
  }))
}

/** A student's tap time from a short "tap the highlighted one" check. */
export function tapBaseline(latencies_ms: number[]): number | null {
  return latencies_ms.length < MIN_TAPS ? null : median(latencies_ms)
}

export function activeThreshold(
  book: ThresholdBook,
  template: string,
  at: string,
): Threshold | undefined {
  const t = Date.parse(at)
  return book
    .filter((x) => x.template === template && Date.parse(x.effective_from) <= t)
    .sort((a, b) => b.version - a.version)[0]
}

/**
 * The net time that best separates sessions felt hard from the rest: a timed
 * drill starts to feel hard once the student is slower than fluent. Null
 * without both kinds of rating.
 */
export function separatingTime(observations: SessionObservation[]): number | null {
  const hard = observations.filter((o) => o.felt === 'hard').map((o) => o.median_net_ms)
  const rest = observations.filter((o) => o.felt !== 'hard').map((o) => o.median_net_ms)
  if (hard.length === 0 || rest.length === 0) return null
  const times = [...new Set([...hard, ...rest])].sort((a, b) => a - b)
  let best = Infinity
  let low = 0
  let high = 0
  for (let i = 0; i < times.length - 1; i++) {
    const cut = times[i]!
    const errors = rest.filter((m) => m > cut).length + hard.filter((m) => m <= cut).length
    if (errors < best) {
      best = errors
      low = cut
      high = times[i + 1]!
    } else if (errors === best && cut === high) {
      high = times[i + 1]!
    }
  }
  return (low + high) / 2
}

/**
 * A new version from students' sessions, or the prior unchanged until there is
 * enough data. The data's estimate is blended with the prior by sample size.
 */
export function calibrate(
  prior: Threshold,
  observations: SessionObservation[],
  effective_from: string,
): Threshold {
  const mine = observations.filter((o) => o.template === prior.template)
  const students = new Set(mine.map((o) => o.student_id)).size
  if (mine.length < MIN_SESSIONS || students < MIN_STUDENTS) return prior
  const estimate = separatingTime(mine)
  if (estimate === null) return prior
  const n = mine.length
  return {
    template: prior.template,
    version: prior.version + 1,
    effective_from,
    fluent_ms: Math.round(
      (PRIOR_WEIGHT_SESSIONS * prior.fluent_ms + n * estimate) / (PRIOR_WEIGHT_SESSIONS + n),
    ),
    source: 'calibrated',
    sessions: n,
    students,
  }
}

const netMs = (e: Evidence) =>
  e.source === 'auto_graded' ? Math.max(1, e.latency_ms - e.tap_ms) : 0
const onTemplate = (e: Evidence, template: string) =>
  e.source === 'auto_graded' && `fretboard_cell:${e.response.kind}` === template

/** Felt-labelled sessions: each rating with the median net time of that session's correct answers. */
export function sessionObservations(
  evidence: Evidence[],
  felt: FeltRating[],
  template: string,
): SessionObservation[] {
  const out: SessionObservation[] = []
  for (const f of felt.filter((x) => x.template === template)) {
    const times = evidence
      .filter(
        (e) =>
          e.session_id === f.session_id &&
          onTemplate(e, template) &&
          e.source === 'auto_graded' &&
          e.correct,
      )
      .map(netMs)
    const m = median(times)
    if (m !== null)
      out.push({
        template,
        student_id: f.student_id,
        session_id: f.session_id,
        median_net_ms: m,
        felt: f.felt,
      })
  }
  return out
}

/** Time only, no felt ratings: the median net time of students who answer it at least 90% right. */
export function knowersMedian(evidence: Evidence[], template: string): number | null {
  const byStudent = new Map<string, Evidence[]>()
  for (const e of evidence.filter((x) => onTemplate(x, template))) {
    const list = byStudent.get(e.student_id)
    if (list) list.push(e)
    else byStudent.set(e.student_id, [e])
  }
  const times: number[] = []
  for (const list of byStudent.values()) {
    const correct = list.filter((e) => e.source === 'auto_graded' && e.correct)
    if (correct.length / list.length >= KNOWER_ACCURACY) times.push(...correct.map(netMs))
  }
  return median(times)
}
