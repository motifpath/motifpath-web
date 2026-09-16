import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useToast } from '@/shared/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Toasts are held in module-level state so any composable caller (and
    // the single mounted ToastStack) shares one list — reset it between
    // tests instead of instantiating a new store each time.
    useToast().clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('adds a success toast', () => {
    const { toasts, success } = useToast()

    success('Exercise created.')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ kind: 'success', message: 'Exercise created.' })
  })

  it('adds an error toast', () => {
    const { toasts, error } = useToast()

    error('Validation failed. /prompt: must not be empty')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ kind: 'error', message: 'Validation failed. /prompt: must not be empty' })
  })

  it('auto-dismisses a success toast after 5 seconds', () => {
    const { toasts, success } = useToast()

    success('Exercise created.')
    vi.advanceTimersByTime(5000)

    expect(toasts.value).toHaveLength(0)
  })

  it('does not auto-dismiss an error toast', () => {
    const { toasts, error } = useToast()

    error('Something went wrong.')
    vi.advanceTimersByTime(60_000)

    expect(toasts.value).toHaveLength(1)
  })

  it('dismiss removes a toast by id', () => {
    const { toasts, error, dismiss } = useToast()

    error('Something went wrong.')
    const id = toasts.value[0].id

    dismiss(id)

    expect(toasts.value).toHaveLength(0)
  })

  it('supports multiple toasts stacking', () => {
    const { toasts, success, error } = useToast()

    success('Exercise created.')
    error('Upload failed.')

    expect(toasts.value).toHaveLength(2)
  })
})
