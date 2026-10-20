import { ref } from 'vue'

export type ToastKind = 'neutral' | 'success' | 'error'

/** The one thing a toast can offer: Undo for a reversible action, Retry for a background one that failed. */
export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastOptions {
  action?: ToastAction
}

export interface Toast {
  id: string
  kind: ToastKind
  message: string
  action?: ToastAction
}

// Module-level, not per-call state: every feature that calls useToast() and
// the one ToastStack mounted in the app shell must all see the same list.
// The list never holds more than one toast — a new one replaces the current
// one — but stays a list so callers can read it the same way either way.
const toasts = ref<Toast[]>([])
let nextId = 0

const AUTO_DISMISS_MS = 5000
const AUTO_DISMISS_WITH_ACTION_MS = 10_000

// The countdown of the toast on screen: what's left of it, and when it last
// (re)started, so pausing it on hover or focus can resume with the rest.
let timer: ReturnType<typeof setTimeout> | null = null
let remainingMs = 0
let startedAt = 0

function stopTimer(): void {
  if (timer !== null) clearTimeout(timer)
  timer = null
}

function startTimer(id: string): void {
  stopTimer()
  startedAt = Date.now()
  timer = setTimeout(() => dismiss(id), remainingMs)
}

function isCurrent(id: string): boolean {
  return toasts.value[0]?.id === id
}

function dismiss(id: string): void {
  if (!isCurrent(id)) return
  stopTimer()
  toasts.value = []
}

function push(kind: ToastKind, message: string, options: ToastOptions = {}): void {
  const id = `toast-${++nextId}`
  toasts.value = [{ id, kind, message, action: options.action }]
  stopTimer()

  // An error stays until dismissed: it often carries detail worth reading
  // (a validation reason, an upload failure), and the student may have moved
  // on before it appeared. Anything else goes on its own, later when it
  // offers an action so there's time to take it.
  if (kind === 'error') return
  remainingMs = options.action ? AUTO_DISMISS_WITH_ACTION_MS : AUTO_DISMISS_MS
  startTimer(id)
}

function pause(id: string): void {
  if (!isCurrent(id) || timer === null) return
  stopTimer()
  remainingMs -= Date.now() - startedAt
}

function resume(id: string): void {
  if (!isCurrent(id) || timer !== null || toasts.value[0].kind === 'error') return
  startTimer(id)
}

function runAction(id: string): void {
  if (!isCurrent(id)) return
  const action = toasts.value[0].action
  dismiss(id)
  action?.run()
}

export function useToast() {
  return {
    toasts,
    neutral: (message: string, options?: ToastOptions) => push('neutral', message, options),
    success: (message: string, options?: ToastOptions) => push('success', message, options),
    error: (message: string, options?: ToastOptions) => push('error', message, options),
    dismiss,
    pause,
    resume,
    runAction,
    clear: () => {
      stopTimer()
      toasts.value = []
    },
  }
}
