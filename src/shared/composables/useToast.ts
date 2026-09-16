import { ref } from 'vue'

export type ToastKind = 'success' | 'error'

export interface Toast {
  id: string
  kind: ToastKind
  message: string
}

// Module-level, not per-call state: every feature that calls useToast() and
// the one ToastStack mounted in the app shell must all see the same list.
const toasts = ref<Toast[]>([])
let nextId = 0

const AUTO_DISMISS_MS = 5000

function dismiss(id: string): void {
  toasts.value = toasts.value.filter((toast) => toast.id !== id)
}

function push(kind: ToastKind, message: string): void {
  const id = `toast-${++nextId}`
  toasts.value = [...toasts.value, { id, kind, message }]

  // Errors often carry detail worth reading (a validation reason, an upload
  // failure) and stay until the teacher dismisses them; success is transient.
  if (kind === 'success') {
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    dismiss,
    clear: () => {
      toasts.value = []
    },
  }
}
