import { ref, shallowRef } from 'vue'

import type { components } from '@/api/generated/core-domain'
import { useApi } from '@/shared/composables/useApi'
import { useProgressionCatalog } from '@/shared/composables/useProgressionCatalog'

type Progression = components['schemas']['Progression']
type ProgressionUse = components['schemas']['ProgressionUse']

/**
 * Where removing a progression stands: finding out whether anything stops it, asking to confirm,
 * refused because of the sections that tag it or because it reached the drills, or unable to tell.
 */
export type RemovalStep = 'checking' | 'confirm' | 'in_use' | 'in_drills' | 'check_failed'

/**
 * Removing a progression. It always starts from a fresh list, since other admins tag and untag, and
 * one the list counts as tagged has its sections read. Only confirming deletes anything.
 */
export function useProgressionRemoval(onRemoved: (progression: Progression) => void) {
  const { coreApi } = useApi()
  const { refresh } = useProgressionCatalog()

  const target = shallowRef<Progression | null>(null)
  const step = ref<RemovalStep>('checking')
  const uses = shallowRef<ProgressionUse[]>([])
  const deleting = ref(false)
  const deleteFailed = ref(false)
  // A check still answering for a dialog closed or reopened since has nothing left to say.
  let current = 0

  async function begin(progression: Progression) {
    const mine = ++current
    target.value = progression
    uses.value = []
    deleteFailed.value = false
    step.value = 'checking'

    const list = await refresh()
    if (mine !== current) return
    if (!list) {
      step.value = 'check_failed'
      return
    }
    const fresh = list.find((p) => p.progression_id === progression.progression_id)
    if (!fresh) target.value = null
    else if (fresh.in_drills) step.value = 'in_drills'
    else if (fresh.song_chart_count === 0) step.value = 'confirm'
    else await readUses(fresh, mine)
  }

  async function readUses(progression: Progression, mine: number) {
    const { data, response } = await coreApi
      .GET('/progressions/{progression_id}', { params: { path: { progression_id: progression.progression_id } } })
      .catch(() => ({ data: undefined, response: undefined }))
    if (mine !== current) return
    if (response?.status === 404) {
      target.value = null
      await refresh()
    } else if (!data) {
      step.value = 'check_failed'
    } else {
      uses.value = data
      step.value = data.length > 0 ? 'in_use' : 'confirm'
    }
  }

  /** Deletes it, or takes in why it can't be. False when the server gave no answer to go on. */
  async function tryDelete(progression: Progression): Promise<boolean> {
    deleting.value = true
    const { error, response } = await coreApi
      .DELETE('/progressions/{progression_id}', { params: { path: { progression_id: progression.progression_id } } })
      .catch(() => ({ error: undefined, response: undefined }))
    const answered = response?.status === 204 || response?.status === 404 || (error !== undefined && 'reason' in error)
    if (answered) await refresh()
    deleting.value = false
    if (!answered) return false

    if (error && 'reason' in error) {
      uses.value = error.uses
      step.value = error.reason
    } else {
      target.value = null
      if (response?.status === 204) onRemoved(progression)
    }
    return true
  }

  async function confirm() {
    const progression = target.value
    if (!progression || deleting.value) return
    deleteFailed.value = !(await tryDelete(progression))
  }

  /** A delete that runs can't be called back, so the dialog waits for its answer. */
  function close() {
    if (deleting.value) return
    current++
    target.value = null
  }

  return { target, step, uses, deleting, deleteFailed, begin, confirm, close }
}
