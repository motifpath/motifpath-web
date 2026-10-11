import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const GET = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET }, eventApi: {} }),
}))

import { useStartingPoints, type FirstRunAnswers } from '@/features/student/composables/useStartingPoints'
import { i18n } from '@/i18n'

const path = { learning_path_id: 'lp-1', title: 'Electric guitar from zero', level: 'beginner', language: 'en', lesson_count: 18 }
const course = { course_id: 'c-1', title: 'Electric guitar basics', level: 'beginner', language: 'en', checkpoint_count: 3, lesson_count: 12 }

interface Responses {
  startingPoints?: unknown[] | 'fail'
  paths?: unknown[]
  courses?: unknown[]
}

function respond({ startingPoints = [], paths = [], courses = [] }: Responses) {
  GET.mockImplementation(async (url: string) => {
    if (url === '/catalog/starting-points') {
      return startingPoints === 'fail'
        ? { data: undefined, error: { message: 'boom' }, response: { status: 500 } }
        : { data: { source: 'curated', items: startingPoints }, error: undefined, response: { status: 200 } }
    }
    const items = url === '/catalog/paths' ? paths : courses
    return { data: { items, total: items.length, limit: 5, offset: 0 }, error: undefined, response: { status: 200 } }
  })
}

const guitarNew: FirstRunAnswers = { instrumentId: 'inst-guitar', experience: 'never_played' }

async function loaded(answers: FirstRunAnswers | null = guitarNew) {
  const result = useStartingPoints(ref(answers))
  await vi.waitFor(() => expect(result.state.value).not.toBe('loading'))
  return result
}

describe('useStartingPoints', () => {
  beforeEach(() => {
    GET.mockReset()
  })
  afterEach(() => {
    i18n.global.locale.value = 'en'
  })

  it('asks core for the starting points of the answers, in the app language', async () => {
    respond({ startingPoints: [{ kind: 'path', path }] })

    await loaded()

    expect(GET).toHaveBeenCalledWith('/catalog/starting-points', {
      params: { query: { instrument_id: 'inst-guitar', experience: 'never_played', language: 'en' } },
    })
  })

  it('asks in Portuguese (Brazil) for a student reading in it', async () => {
    i18n.global.locale.value = 'pt-BR'
    respond({ startingPoints: [{ kind: 'path', path }] })

    await loaded()

    expect(GET.mock.calls[0][1].params.query.language).toBe('pt_BR')
  })

  it('shows the starting points in the order they came, paths and courses alike', async () => {
    respond({ startingPoints: [{ kind: 'course', course }, { kind: 'path', path }] })

    const { state, items } = await loaded()

    expect(state.value).toBe('results')
    expect(items.value.map((item) => [item.kind, item.id])).toEqual([
      ['course', 'c-1'],
      ['path', 'lp-1'],
    ])
    expect(items.value[0]).toMatchObject({ title: 'Electric guitar basics', level: 'beginner', language: 'en', lessonCount: 12 })
  })

  it("offers the instrument's other levels, paths first, when nothing suits the answers", async () => {
    respond({ startingPoints: [], paths: [path], courses: [course] })

    const { state, items } = await loaded()

    expect(state.value).toBe('closest')
    expect(items.value.map((item) => item.kind)).toEqual(['path', 'course'])
    expect(GET).toHaveBeenCalledWith('/catalog/paths', {
      params: { query: { instrument_id: 'inst-guitar', language: 'en', limit: 5, offset: 0 } },
    })
  })

  it('says there is nothing for the instrument when even other levels have nothing', async () => {
    respond({ startingPoints: [] })

    expect((await loaded()).state.value).toBe('nothing')
  })

  it('fails in place and can try again', async () => {
    respond({ startingPoints: 'fail' })
    const result = await loaded()

    expect(result.state.value).toBe('failed')

    respond({ startingPoints: [{ kind: 'path', path }] })
    await result.retry()

    expect(result.state.value).toBe('results')
  })

  it('asks nothing until there are answers', () => {
    const { state } = useStartingPoints(ref(null))

    expect(state.value).toBe('idle')
    expect(GET).not.toHaveBeenCalled()
  })
})
