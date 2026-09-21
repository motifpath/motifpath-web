import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type MaybeRefOrGetter } from 'vue'
import { flushPromises } from '@vue/test-utils'

import {
  makeStudentPathItem,
  makeStudentPathView,
} from '@/features/student/testing/studentPathItem'
import { makeTimedCue } from '@/features/student/testing/expandedContent'

const get = vi.fn()

vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { GET: get }, eventApi: {} }),
}))

import { useLessonNode } from '@/features/student/composables/useLessonNode'

const PATH = '/students/me/path'
const NODE = '/content-nodes/{content_node_id}'
const CUES = '/content-nodes/{content_node_id}/expanded-content'
const CHALLENGES = '/content-nodes/{content_node_id}/challenges'

const videoNode = {
  content_node_id: 'node-2',
  title: 'Step 2',
  content_type: 'video',
  media_url: 'https://cdn.example.test/lesson.mp4',
}

type Result = { data?: unknown; error?: unknown; response?: { status: number } }

const ok = (data: unknown): Result => ({ data, error: undefined })
const fail = (status: number): Result => ({
  data: undefined,
  error: { message: 'failed' },
  response: { status },
})

/** Answers each endpoint from `results`; an endpoint left out resolves to a server error. */
function respondWith(results: Record<string, Result>) {
  get.mockImplementation((url: string) => Promise.resolve(results[url] ?? fail(500)))
}

function pathWith(status: 'completed' | 'in_progress' | 'not_started' | 'locked') {
  return ok(
    makeStudentPathView([
      makeStudentPathItem(1, undefined, 'completed'),
      makeStudentPathItem(2, undefined, status),
    ]),
  )
}

const healthy = {
  [PATH]: pathWith('in_progress'),
  [NODE]: ok(videoNode),
  [CUES]: ok({ items: [makeTimedCue('a', 2, 4)] }),
  [CHALLENGES]: ok([]),
}

async function load(nodeId: MaybeRefOrGetter<string> = 'node-2') {
  const lesson = useLessonNode(nodeId)
  await flushPromises()
  return lesson
}

describe('useLessonNode', () => {
  beforeEach(() => {
    get.mockReset()
  })

  it('starts in the loading state', () => {
    respondWith(healthy)

    const { state } = useLessonNode('node-2')

    expect(state.value).toBe('loading')
  })

  it('is ready with the node, its cues and the path status for a video step', async () => {
    respondWith(healthy)

    const { state, node, cues, status } = await load()

    expect(state.value).toBe('ready')
    expect(node.value?.title).toBe('Step 2')
    expect(cues.value).toHaveLength(1)
    expect(status.value).toBe('in_progress')
  })

  it.each(['not_started', 'in_progress', 'completed'] as const)(
    'reports the %s status of the step',
    async (status) => {
      respondWith({ ...healthy, [PATH]: pathWith(status) })

      const lesson = await load()

      expect(lesson.status.value).toBe(status)
      expect(lesson.state.value).toBe('ready')
    },
  )

  it('knows a step has a challenge when the node lists one', async () => {
    respondWith({ ...healthy, [CHALLENGES]: ok([{ challenge_id: 'c-1' }]) })

    const { hasChallenge } = await load()

    expect(hasChallenge.value).toBe(true)
  })

  it('knows a step has no challenge when the node lists none', async () => {
    respondWith(healthy)

    const { hasChallenge } = await load()

    expect(hasChallenge.value).toBe(false)
  })

  it('is locked, and fetches nothing about the node, when the step is locked', async () => {
    respondWith({ ...healthy, [PATH]: pathWith('locked') })

    const { state } = await load()

    expect(state.value).toBe('locked')
    expect(get).toHaveBeenCalledTimes(1)
    expect(get).toHaveBeenCalledWith(PATH, expect.anything())
  })

  it('is not found when the node is not on the student path', async () => {
    respondWith(healthy)

    const { state } = await load('some-other-node')

    expect(state.value).toBe('not-found')
  })

  it('is not found when the student has no assigned path', async () => {
    respondWith({ ...healthy, [PATH]: fail(404) })

    const { state } = await load()

    expect(state.value).toBe('not-found')
  })

  it.each([
    ['the path', PATH],
    ['the node', NODE],
    ['the challenges', CHALLENGES],
  ])('is an error when loading %s fails', async (_label, endpoint) => {
    respondWith({ ...healthy, [endpoint]: fail(500) })

    const { state } = await load()

    expect(state.value).toBe('error')
  })

  it('is an error when a request fails outright', async () => {
    get.mockRejectedValue(new Error('network down'))

    const { state } = await load()

    expect(state.value).toBe('error')
  })

  it('still plays the lesson, without cues, when only the cues fail to load', async () => {
    respondWith({ ...healthy, [CUES]: fail(500) })

    const { state, cues } = await load()

    expect(state.value).toBe('ready')
    expect(cues.value).toEqual([])
  })

  it.each(['article', 'diagram'])('is unsupported for a %s step', async (contentType) => {
    respondWith({ ...healthy, [NODE]: ok({ ...videoNode, content_type: contentType }) })

    const { state } = await load()

    expect(state.value).toBe('unsupported')
  })

  it('has no media when a video step has no media URL', async () => {
    respondWith({ ...healthy, [NODE]: ok({ ...videoNode, media_url: undefined }) })

    const { state } = await load()

    expect(state.value).toBe('no-media')
  })

  it('retry loads again and recovers from an error', async () => {
    respondWith({ ...healthy, [NODE]: fail(500) })
    const { state, retry } = await load()
    expect(state.value).toBe('error')

    respondWith(healthy)
    await retry()

    expect(state.value).toBe('ready')
  })

  it('shows the loading state again while it retries', async () => {
    respondWith({ ...healthy, [NODE]: fail(500) })
    const { state, retry } = await load()

    respondWith(healthy)
    const pending = retry()

    expect(state.value).toBe('loading')
    await pending
  })

  it('reloads when the node id changes', async () => {
    respondWith({
      ...healthy,
      [PATH]: ok(
        makeStudentPathView([
          makeStudentPathItem(1, undefined, 'completed'),
          makeStudentPathItem(2, undefined, 'in_progress'),
        ]),
      ),
    })
    const nodeId = ref('node-1')
    const { state } = await load(nodeId)
    expect(state.value).toBe('ready')

    nodeId.value = 'node-9'
    await flushPromises()

    expect(state.value).toBe('not-found')
  })

  it('ignores a slow response that a newer load has superseded', async () => {
    let releaseFirstPath: (result: Result) => void = () => {}
    const firstPath = new Promise<Result>((resolve) => {
      releaseFirstPath = resolve
    })
    get.mockImplementationOnce(() => firstPath)
    respondWith(healthy)
    const { state, node, retry } = useLessonNode('node-2')

    await retry()
    releaseFirstPath(ok(makeStudentPathView([makeStudentPathItem(1, undefined, 'locked')])))
    await flushPromises()

    expect(state.value).toBe('ready')
    expect(node.value?.title).toBe('Step 2')
  })
})
