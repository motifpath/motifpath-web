import { computed, ref } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { nextTempo } from '@/features/student/utils/tempoLadder'
import type { RatedTake, TakeRating } from '@/features/student/utils/tempoLadder'
import { useEventTracking } from '@/shared/composables/useEventTracking'

type Plan = components['schemas']['PracticeSessionPlan']
type Item = components['schemas']['PracticeSessionItem']

/** Takes of a play-along, as core estimates the session's time with them. */
const FOCUS_TAKES = 4
const WARM_UP_TAKES = 2

const takesOf = (item: Item) => (item.reason === 'warm_up' ? WARM_UP_TAKES : FOCUS_TAKES)

/**
 * Runs one composed practice session of play-alongs: which item is on, at what
 * tempo its next take plays, and how many takes it has left, with the
 * practice.* events the run produces.
 *
 * A focus item's tempo follows the tempo ladder from its start tempo; a
 * warm-up plays its takes at its own tempo, outside the ladder, and its takes
 * are never sent as practice.item_answered, since they are not evidence. An
 * item moves on after its last take, or when the student moves on; the
 * session ends after the last item, or when the student ends it. Nothing is
 * sent before start() or after the end.
 */
export function usePracticeSessionRun(plan: Plan) {
  const { track } = useEventTracking()

  const index = ref(0)
  const takes = ref<RatedTake[]>([])
  const started = ref(false)
  const finished = ref(false)
  const answeredItems = ref(new Set<string>())
  /** How many items the student rated a take of; a warm-up never counts. */
  const answeredCount = computed(() => answeredItems.value.size)

  const current = computed<Item | null>(() => (finished.value ? null : (plan.items[index.value] ?? null)))

  const tempo = computed(() => {
    const playAlong = current.value?.play_along
    if (!playAlong) return null
    if (current.value!.reason === 'warm_up') return playAlong.start_tempo_bpm
    return nextTempo({ start: playAlong.start_tempo_bpm, target: playAlong.target_tempo_bpm }, takes.value)
  })

  const takesLeft = computed(() => (current.value ? takesOf(current.value) - takes.value.length : 0))

  const active = () => started.value && !finished.value

  function start() {
    if (started.value) return
    started.value = true
    void track({
      event_type: 'practice.session_started',
      practice_session_id: plan.practice_session_id,
      ...(plan.instrument_id ? { instrument_id: plan.instrument_id } : {}),
      minutes: plan.minutes,
      planned_items: plan.items.map((item) => ({ item_key: item.item_key, reason: item.reason })),
    })
  }

  function finish(leftEarly: boolean) {
    finished.value = true
    void track({
      event_type: 'practice.session_ended',
      practice_session_id: plan.practice_session_id,
      answered_count: answeredCount.value,
      left_early: leftEarly,
      felt_ratings: [],
    })
  }

  /** Moves to the next item, or finishes the session after the last one. */
  function nextItem() {
    if (!active()) return
    takes.value = []
    if (index.value + 1 >= plan.items.length) {
      finish(false)
      return
    }
    index.value++
  }

  /** Records the student's rating of the take just played at the current tempo. */
  function rate(rating: TakeRating) {
    const item = current.value
    const bpm = tempo.value
    if (!active() || !item || bpm === null) return

    if (item.reason !== 'warm_up') {
      answeredItems.value = new Set(answeredItems.value).add(item.item_key)
      void track({
        event_type: 'practice.item_answered',
        practice_session_id: plan.practice_session_id,
        item_key: item.item_key,
        response: { response_type: 'self_rating', rating, tempo_bpm: bpm },
      })
    }
    takes.value = [...takes.value, { bpm, rating }]
    if (takesLeft.value <= 0) nextItem()
  }

  /** Ends the session now, before its last item. */
  function end() {
    if (active()) finish(true)
  }

  return { plan, index, current, tempo, takesLeft, answeredCount, finished, start, rate, nextItem, end }
}
