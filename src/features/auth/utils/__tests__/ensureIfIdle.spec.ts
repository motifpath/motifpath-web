import { describe, expect, it, vi } from 'vitest'

import { ensureIfIdle } from '@/features/auth/utils/ensureIfIdle'

describe('ensureIfIdle', () => {
  it('calls ensure when state is idle', () => {
    const ensure = vi.fn(async () => {})
    ensureIfIdle({ state: 'idle', ensure })

    expect(ensure).toHaveBeenCalledOnce()
  })

  it('does not call ensure when state is registering', () => {
    const ensure = vi.fn(async () => {})
    ensureIfIdle({ state: 'registering', ensure })

    expect(ensure).not.toHaveBeenCalled()
  })

  it('does not call ensure when state is registered', () => {
    const ensure = vi.fn(async () => {})
    ensureIfIdle({ state: 'registered', ensure })

    expect(ensure).not.toHaveBeenCalled()
  })

  it('does not call ensure when state is genuinely failed — retrying is an explicit user action, not automatic', () => {
    const ensure = vi.fn(async () => {})
    ensureIfIdle({ state: 'failed', ensure })

    expect(ensure).not.toHaveBeenCalled()
  })
})
