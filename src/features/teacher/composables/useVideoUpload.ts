import { readonly, ref } from 'vue'

import { useApi } from '@/shared/composables/useApi'
import { openInWebView } from '@/shared/platform/webViewRequest'

/** The largest video a lesson may upload: 1 GB, the limit the server signs into the upload URL. */
export const MAX_VIDEO_BYTES = 1024 * 1024 * 1024

// Uploaded lesson videos are stored as lessons/<uuid>.mp4; the file's own
// name is not kept, so a stored URL is recognised by that shape alone.
const UPLOADED_LESSON_VIDEO = /\/lessons\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$/i

/** Whether a lesson's video URL points at a file uploaded here, rather than a pasted link. */
export function isUploadedLessonVideo(url: string): boolean {
  try {
    return UPLOADED_LESSON_VIDEO.test(new URL(url).pathname)
  } catch {
    return false
  }
}

/** Why a file was refused before anything was sent. */
export type VideoRefusal = 'format' | 'size'

export type VideoUploadState =
  | { status: 'idle' }
  | { status: 'refused'; fileName: string; size: number; reason: VideoRefusal }
  | { status: 'uploading'; fileName: string; loaded: number; total: number }
  | { status: 'uploaded'; fileName: string; total: number; objectUrl: string }
  | { status: 'failed'; fileName: string; total: number }

// The upload URL is signed for exactly this Content-Type; any other value is
// a signature mismatch and storage refuses the PUT.
const VIDEO_MIME_TYPE = 'video/mp4'

/**
 * Only an MP4 is accepted. Some browsers report no type for a file, so the
 * name decides then; a file that does report a type must report video/mp4.
 */
function refusalOf(file: File): VideoRefusal | null {
  const isMp4 = file.name.toLowerCase().endsWith('.mp4') && (file.type === '' || file.type === VIDEO_MIME_TYPE)
  if (!isMp4) return 'format'
  if (file.size > MAX_VIDEO_BYTES) return 'size'
  return null
}

/**
 * Uploads a lesson's MP4 straight to storage. The file never passes through
 * this app's server: the server grants an upload URL bound to the file's exact
 * size, and the browser PUTs the bytes to it with XMLHttpRequest, the one
 * browser API that reports upload progress. A failed upload starts over from
 * the first byte; there is no resuming.
 *
 * Every upload settles to the stored object URL, or to null when it was
 * refused, cancelled or failed.
 */
export function useVideoUpload() {
  const { coreApi } = useApi()

  const state = ref<VideoUploadState>({ status: 'idle' })
  let file: File | null = null
  let xhr: XMLHttpRequest | null = null
  let running: Promise<string | null> | null = null
  // Bumped on cancel and on every new upload, so a superseded upload's late
  // callbacks can't overwrite the state of the one that replaced it.
  let generation = 0

  function put(uploadUrl: string, current: File, mine: number): Promise<boolean> {
    return new Promise((resolve) => {
      const request = new XMLHttpRequest()
      xhr = request
      openInWebView(request, 'PUT', uploadUrl)
      request.setRequestHeader('Content-Type', VIDEO_MIME_TYPE)
      request.upload.onprogress = (event) => {
        if (mine !== generation) return
        state.value = { status: 'uploading', fileName: current.name, loaded: event.loaded, total: current.size }
      }
      request.onload = () => resolve(request.status >= 200 && request.status < 300)
      request.onerror = () => resolve(false)
      request.onabort = () => resolve(false)
      request.send(current)
    })
  }

  async function run(current: File, mine: number): Promise<string | null> {
    state.value = { status: 'uploading', fileName: current.name, loaded: 0, total: current.size }
    const failed = () => {
      if (mine === generation) state.value = { status: 'failed', fileName: current.name, total: current.size }
      return null
    }

    const { data } = await coreApi.POST('/media/upload-url', {
      body: { purpose: 'lesson_video', content_type: 'video', file_name: current.name, file_size: current.size },
    })
    if (mine !== generation) return null
    if (!data) return failed()

    const ok = await put(data.upload_url, current, mine)
    if (mine !== generation) return null
    if (!ok) return failed()

    state.value = { status: 'uploaded', fileName: current.name, total: current.size, objectUrl: data.object_url }
    return data.object_url
  }

  function start(current: File): Promise<string | null> {
    generation += 1
    const mine = generation
    const upload = run(current, mine).finally(() => {
      if (running === upload) running = null
      if (mine === generation) xhr = null
    })
    running = upload
    return upload
  }

  /** Checks the file, then uploads it; refused files are never sent. */
  function choose(chosen: File): Promise<string | null> {
    cancel()
    const reason = refusalOf(chosen)
    if (reason) {
      state.value = { status: 'refused', fileName: chosen.name, size: chosen.size, reason }
      return Promise.resolve(null)
    }
    file = chosen
    return start(chosen)
  }

  /** Starts the last chosen file again from the beginning. */
  function retry(): Promise<string | null> {
    if (!file) return Promise.resolve(null)
    return start(file)
  }

  /** Stops the upload in progress, if any, and goes back to choosing a file. */
  function cancel() {
    if (state.value.status !== 'uploading') return
    generation += 1
    xhr?.abort()
    xhr = null
    state.value = { status: 'idle' }
  }

  /** Waits for the upload in progress; null when nothing is uploading. */
  function settled(): Promise<string | null> {
    return running ?? Promise.resolve(null)
  }

  /** Forgets the last upload, e.g. when the lesson's video is removed or replaced by a link. */
  function reset() {
    cancel()
    file = null
    state.value = { status: 'idle' }
  }

  return { state: readonly(state), choose, retry, cancel, settled, reset }
}
