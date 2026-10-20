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

  it('adds a neutral toast', () => {
    const { toasts, neutral } = useToast()

    neutral('Major triads is now your current course.')

    expect(toasts.value[0]).toMatchObject({ kind: 'neutral', message: 'Major triads is now your current course.' })
  })

  it('auto-dismisses a success or neutral toast after 5 seconds', () => {
    const { toasts, success, neutral } = useToast()

    success('Exercise created.')
    vi.advanceTimersByTime(4999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)

    neutral('Saved for later.')
    vi.advanceTimersByTime(5000)
    expect(toasts.value).toHaveLength(0)
  })

  it('keeps a toast with an action for 10 seconds', () => {
    const { toasts, neutral } = useToast()

    neutral('Major triads is now your current course.', { action: { label: 'Undo', run: () => {} } })
    vi.advanceTimersByTime(9999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
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

  it('shows one toast at a time: a new toast replaces the current one', () => {
    const { toasts, success, error } = useToast()

    success('Exercise created.')
    error('Upload failed.')

    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0]).toMatchObject({ kind: 'error', message: 'Upload failed.' })
  })

  it("does not let a replaced toast's timer dismiss its replacement", () => {
    const { toasts, success, neutral } = useToast()

    success('First.')
    vi.advanceTimersByTime(3000)
    neutral('Second.')
    vi.advanceTimersByTime(2000)

    expect(toasts.value[0]).toMatchObject({ message: 'Second.' })
  })

  it('runs the action once and dismisses the toast', () => {
    const run = vi.fn()
    const { toasts, neutral, runAction } = useToast()

    neutral('Major triads is now your current course.', { action: { label: 'Undo', run } })
    runAction(toasts.value[0].id)
    runAction(toasts.value[0]?.id ?? 'gone')

    expect(run).toHaveBeenCalledTimes(1)
    expect(toasts.value).toHaveLength(0)
  })

  it('pauses the countdown while paused and resumes with the time that was left', () => {
    const { toasts, success, pause, resume } = useToast()

    success('Exercise created.')
    const id = toasts.value[0].id
    vi.advanceTimersByTime(3000)
    pause(id)
    vi.advanceTimersByTime(60_000)
    expect(toasts.value).toHaveLength(1)

    resume(id)
    vi.advanceTimersByTime(1999)
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(toasts.value).toHaveLength(0)
  })
})
