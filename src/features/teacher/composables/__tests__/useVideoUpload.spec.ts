import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const POST = vi.fn()
vi.mock('@/shared/composables/useApi', () => ({
  useApi: () => ({ coreApi: { POST }, eventApi: {} }),
}))

import { isUploadedLessonVideo, MAX_VIDEO_BYTES, useVideoUpload } from '@/features/teacher/composables/useVideoUpload'

const MB = 1024 * 1024

/** A stand-in for the browser's XMLHttpRequest that the test drives by hand. */
class FakeXhr {
  static last: FakeXhr | null = null
  static all: FakeXhr[] = []
  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  status = 0
  aborted = false
  upload: { onprogress: ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) | null } = {
    onprogress: null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null

  constructor() {
    FakeXhr.last = this
    FakeXhr.all.push(this)
  }
  open(method: string, url: string) {
    this.method = method
    this.url = url
  }
  setRequestHeader(name: string, value: string) {
    this.headers[name] = value
  }
  send(body: unknown) {
    this.body = body
  }
  abort() {
    this.aborted = true
    this.onabort?.()
  }
  progress(loaded: number, total: number) {
    this.upload.onprogress?.({ loaded, total, lengthComputable: true })
  }
  finish(status: number) {
    this.status = status
    this.onload?.()
  }
  fail() {
    this.onerror?.()
  }
}

/** A File whose reported size is `size` without allocating it. */
function videoFile(name: string, size: number, type = 'video/mp4'): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

function grantUploadUrl() {
  POST.mockResolvedValueOnce({
    data: {
      upload_url: 'https://storage.test/lessons/id-1.mp4?sig=1',
      object_url: 'https://media.test/lessons/id-1.mp4',
      expires_at: '2026-10-12T00:15:00Z',
    },
    error: undefined,
    response: { status: 201 },
  })
}

describe('useVideoUpload', () => {
  beforeEach(() => {
    POST.mockReset()
    FakeXhr.last = null
    FakeXhr.all = []
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('allows up to 1 GB', () => {
    expect(MAX_VIDEO_BYTES).toBe(1073741824)
  })

  it('asks for a lesson_video URL with the file size, then PUTs the file as video/mp4', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()
    const file = videoFile('open-chords-lesson.mp4', 980 * MB)

    void upload.choose(file)
    await flushPromises()

    expect(POST).toHaveBeenCalledWith('/media/upload-url', {
      body: { purpose: 'lesson_video', content_type: 'video', file_name: 'open-chords-lesson.mp4', file_size: 980 * MB },
    })
    const xhr = FakeXhr.last
    expect(xhr?.method).toBe('PUT')
    expect(xhr?.url).toBe('https://storage.test/lessons/id-1.mp4?sig=1')
    expect(xhr?.headers['Content-Type']).toBe('video/mp4')
    expect(xhr?.body).toBe(file)
  })

  it('opens the PUT on the WebView in the app shell, so a large video keeps its progress and never crosses the bridge', async () => {
    const webViewOpen = vi.fn(function (this: FakeXhr, method: string, url: string) {
      this.method = method
      this.url = url
    })
    Reflect.set(window, 'CapacitorWebXMLHttpRequest', { open: webViewOpen })

    try {
      grantUploadUrl()
      void useVideoUpload().choose(videoFile('open-chords-lesson.mp4', 980 * MB))
      await flushPromises()

      expect(webViewOpen).toHaveBeenCalledWith('PUT', 'https://storage.test/lessons/id-1.mp4?sig=1')
      expect(webViewOpen.mock.contexts[0]).toBe(FakeXhr.last)
    } finally {
      Reflect.deleteProperty(window, 'CapacitorWebXMLHttpRequest')
    }
  })

  it('reports progress while uploading, then the object URL', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()

    const result = upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))
    await flushPromises()
    FakeXhr.last?.progress(490 * MB, 980 * MB)

    expect(upload.state.value).toEqual({
      status: 'uploading',
      fileName: 'open-chords-lesson.mp4',
      loaded: 490 * MB,
      total: 980 * MB,
    })

    FakeXhr.last?.finish(200)

    await expect(result).resolves.toBe('https://media.test/lessons/id-1.mp4')
    expect(upload.state.value).toEqual({
      status: 'uploaded',
      fileName: 'open-chords-lesson.mp4',
      total: 980 * MB,
      objectUrl: 'https://media.test/lessons/id-1.mp4',
    })
  })

  it.each([
    ['a .mov', videoFile('lesson.mov', 300 * MB, 'video/quicktime'), 'format'],
    ['a .webm', videoFile('lesson.webm', 300 * MB, 'video/webm'), 'format'],
    ['an .mp4 name on another type', videoFile('lesson.mp4', 300 * MB, 'video/quicktime'), 'format'],
    ['over 1 GB', videoFile('long-lesson.mp4', MAX_VIDEO_BYTES + 1), 'size'],
  ] as const)('refuses %s before anything is sent', async (_name, file, reason) => {
    const upload = useVideoUpload()

    await expect(upload.choose(file)).resolves.toBeNull()

    expect(upload.state.value).toEqual({ status: 'refused', fileName: file.name, size: file.size, reason })
    expect(POST).not.toHaveBeenCalled()
    expect(FakeXhr.last).toBeNull()
  })

  it('accepts an .mp4 the browser gives no type, and exactly 1 GB', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()

    void upload.choose(videoFile('OPEN-CHORDS.MP4', MAX_VIDEO_BYTES, ''))
    await flushPromises()

    expect(upload.state.value.status).toBe('uploading')
  })

  it('cancels an upload and goes back to choosing a file', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()

    const result = upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))
    await flushPromises()
    upload.cancel()

    await expect(result).resolves.toBeNull()
    expect(FakeXhr.last?.aborted).toBe(true)
    expect(upload.state.value).toEqual({ status: 'idle' })
  })

  it.each([
    ['the connection drops', (xhr: FakeXhr) => xhr.fail()],
    ['storage refuses the PUT', (xhr: FakeXhr) => xhr.finish(403)],
  ])('fails when %s, and trying again starts over', async (_name, breakIt) => {
    grantUploadUrl()
    const upload = useVideoUpload()

    const first = upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))
    await flushPromises()
    const firstXhr = FakeXhr.last
    if (firstXhr) breakIt(firstXhr)

    await expect(first).resolves.toBeNull()
    expect(upload.state.value).toEqual({ status: 'failed', fileName: 'open-chords-lesson.mp4', total: 980 * MB })

    grantUploadUrl()
    const second = upload.retry()
    await flushPromises()

    expect(POST).toHaveBeenCalledTimes(2)
    expect(FakeXhr.all).toHaveLength(2)
    expect(upload.state.value).toMatchObject({ status: 'uploading', loaded: 0 })
    FakeXhr.last?.finish(200)
    await expect(second).resolves.toBe('https://media.test/lessons/id-1.mp4')
  })

  it('fails without uploading when no upload URL is granted', async () => {
    POST.mockResolvedValueOnce({ data: undefined, error: { message: 'boom' }, response: { status: 500 } })
    const upload = useVideoUpload()

    await expect(upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))).resolves.toBeNull()

    expect(upload.state.value.status).toBe('failed')
    expect(FakeXhr.last).toBeNull()
  })

  it('lets a caller wait for the upload in progress', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()
    void upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))
    await flushPromises()

    const waited = upload.settled()
    FakeXhr.last?.finish(200)

    await expect(waited).resolves.toBe('https://media.test/lessons/id-1.mp4')
  })

  it('has nothing to wait for when no upload is running', async () => {
    const upload = useVideoUpload()

    await expect(upload.settled()).resolves.toBeNull()
  })

  it('reset forgets a finished upload', async () => {
    grantUploadUrl()
    const upload = useVideoUpload()
    const result = upload.choose(videoFile('open-chords-lesson.mp4', 980 * MB))
    await flushPromises()
    FakeXhr.last?.finish(200)
    await result

    upload.reset()

    expect(upload.state.value).toEqual({ status: 'idle' })
  })
})

describe('isUploadedLessonVideo', () => {
  it.each([
    ['https://media.motifpath.com/lessons/0f8fad5b-d9cb-469f-a165-70867728950e.mp4', true],
    ['http://localhost:9000/motifpath-content-media/lessons/0F8FAD5B-D9CB-469F-A165-70867728950E.MP4', true],
    ['https://cdn.example.com/lesson.mp4', false],
    ['https://youtu.be/abc123', false],
    ['https://media.motifpath.com/library/0f8fad5b-d9cb-469f-a165-70867728950e.mp4', false],
    ['not a url', false],
    ['', false],
  ])('%s → %s', (url, expected) => {
    expect(isUploadedLessonVideo(url)).toBe(expected)
  })
})
