import { onScopeDispose, ref } from 'vue'

import type { SubjectLevels } from '@/features/student/utils/levelChange'
import { useApi } from '@/shared/composables/useApi'

// The worker folds a session's answers in moments after its end: read again this often, for this long.
const READ_EVERY_MS = 1000
const GIVE_UP_AFTER_MS = 5000

/**
 * Where the student stands on a finished session's subjects, for its summary. Once started, reads
 * until the session is caught up — its end folded, so the levels include its answers — every
 * second, and gives up after 5 seconds, a failed read counting as not caught up.
 */
export function useSessionSubjectProgress() {
  const { coreApi } = useApi()
  const levels = ref<SubjectLevels>({ state: 'unknown' })
  let timer: ReturnType<typeof setTimeout> | undefined
  // Each start gets its own run, so a read of an earlier one answering late is dropped.
  let run = 0

  function stop() {
    run++
    clearTimeout(timer)
    levels.value = { state: 'unknown' }
  }

  function start(sessionId: string, instrumentId: string | null, nodeIds: string[]) {
    stop()
    if (nodeIds.length === 0) return
    const thisRun = run
    const startedAt = Date.now()
    const query = instrumentId ? { instrument_id: instrumentId, node_id: nodeIds } : { node_id: nodeIds }
    levels.value = { state: 'pending' }

    async function read() {
      const { data } = await coreApi.GET('/students/me/practice-sessions/{practice_session_id}/subject-progress', {
        params: { path: { practice_session_id: sessionId }, query },
      })
      if (thisRun !== run) return
      if (data?.caught_up) levels.value = { state: 'read', subjects: data.subjects }
      else if (Date.now() - startedAt >= GIVE_UP_AFTER_MS) levels.value = { state: 'unknown' }
      else timer = setTimeout(() => void read(), READ_EVERY_MS)
    }
    void read()
  }

  onScopeDispose(stop)

  return { levels, start, stop }
}
