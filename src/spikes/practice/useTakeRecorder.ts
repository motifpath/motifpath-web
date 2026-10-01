/** Records the camera and microphone during a take, for the student's own archive. */
import { onScopeDispose, ref } from 'vue'

export function useTakeRecorder() {
  const recording = ref(false)
  const error = ref<string | null>(null)
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let startedAt = 0

  async function start() {
    error.value = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      chunks = []
      recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.start()
      startedAt = performance.now()
      recording.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Camera unavailable'
    }
  }

  /** Stops and hands back the take as a local URL, or null when nothing was recorded. */
  function stop(): Promise<{ url: string; seconds: number } | null> {
    const r = recorder
    if (!r || r.state === 'inactive') return Promise.resolve(null)
    return new Promise((resolve) => {
      r.onstop = () => {
        stream?.getTracks().forEach((t) => t.stop())
        recording.value = false
        const blob = new Blob(chunks, { type: r.mimeType })
        resolve({ url: URL.createObjectURL(blob), seconds: Math.round((performance.now() - startedAt) / 1000) })
      }
      r.stop()
    })
  }

  onScopeDispose(() => {
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    stream?.getTracks().forEach((t) => t.stop())
  })

  return { recording, error, start, stop }
}
