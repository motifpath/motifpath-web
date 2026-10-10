import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, type EffectScope } from 'vue'

const get = vi.fn()

// The profile's locale is the one the server confirmed; the path's language locks follow it.
const currentUser = reactive({ profile: { locale: { code: 'en', name: 'English' } } })
vi.mock('@/stores/currentUser', () => ({ useCurrentUserStore: () => currentUser }))

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useStudentPath as useStudentPathUnscoped } from '@/features/student/composables/useStudentPath'

// Each call runs in its own scope, stopped after the test, so an earlier test's locale watcher
// can't reload in a later one.
const scopes: EffectScope[] = []
function useStudentPath() {
  const scope = effectScope()
  scopes.push(scope)
  const result = scope.run(useStudentPathUnscoped)
  if (!result) throw new Error('useStudentPath did not run')
  return result
}
afterEach(() => {
  scopes.splice(0).forEach((scope) => scope.stop())
})

async function settle() {
  await nextTick()
  await nextTick()
}

describe('useStudentPath', () => {
  it('exposes the loaded path on success', async () => {
    get.mockResolvedValueOnce({ data: { title: 'Blues Foundations', items: [] }, error: undefined })

    const { data, error, isLoading } = useStudentPath()
    await settle()

    expect(isLoading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(data.value?.title).toBe('Blues Foundations')
  })

  it('reports a distinct state when the student has no assigned path', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'not found' }, response: { status: 404 } })

    const { data, error } = useStudentPath()
    await settle()

    expect(data.value).toBeNull()
    expect(error.value).toBe('no-path')
  })

  it('reports a generic failure for other errors', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })

    const { error } = useStudentPath()
    await settle()

    expect(error.value).toBe('load-failed')
  })

  it('retry re-requests the path', async () => {
    get.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const { error, retry } = useStudentPath()
    await settle()
    expect(error.value).toBe('load-failed')

    get.mockResolvedValueOnce({ data: { title: 'Blues Foundations', items: [] }, error: undefined })
    await retry()

    expect(error.value).toBeNull()
  })

  it('reloads the path when the server confirms a new locale, without going back to loading', async () => {
    currentUser.profile.locale = { code: 'en', name: 'English' }
    get.mockResolvedValueOnce({ data: { title: 'Blues Foundations', items: [] }, error: undefined })
    const { data, isLoading } = useStudentPath()
    await settle()

    get.mockClear()
    get.mockResolvedValueOnce({ data: { title: 'Fundamentos do blues', items: [] }, error: undefined })
    currentUser.profile.locale = { code: 'pt-BR', name: 'Português' }
    await nextTick()

    expect(get).toHaveBeenCalledWith('/students/me/path')
    expect(isLoading.value).toBe(false)
    await settle()
    expect(data.value?.title).toBe('Fundamentos do blues')
  })
})
