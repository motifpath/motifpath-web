import { afterEach, describe, expect, it, vi } from 'vitest'

import { i18n } from '@/i18n'
import { createLocaleLoader } from '@/shared/utils/createLocaleLoader'

describe('createLocaleLoader', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('merges the loaded en and pt-BR messages into the global i18n instance', async () => {
    const merge = vi.spyOn(i18n.global, 'mergeLocaleMessage')
    const en = { default: { greeting: 'Hello' } }
    const ptBr = { default: { greeting: 'Olá' } }
    const ensureLoaded = createLocaleLoader(
      () => Promise.resolve(en),
      () => Promise.resolve(ptBr),
    )

    await ensureLoaded()

    expect(merge).toHaveBeenCalledWith('en', en.default)
    expect(merge).toHaveBeenCalledWith('pt-BR', ptBr.default)
  })

  it('only loads once across repeated calls, reusing the same in-flight or settled promise', async () => {
    const loadEn = vi.fn(() => Promise.resolve({ default: {} }))
    const loadPtBr = vi.fn(() => Promise.resolve({ default: {} }))
    const ensureLoaded = createLocaleLoader(loadEn, loadPtBr)

    await Promise.all([ensureLoaded(), ensureLoaded(), ensureLoaded()])
    await ensureLoaded()

    expect(loadEn).toHaveBeenCalledOnce()
    expect(loadPtBr).toHaveBeenCalledOnce()
  })

  it('does not cache a failed attempt, so the next call retries', async () => {
    const loadEn = vi
      .fn()
      .mockRejectedValueOnce(new Error('chunk load failed'))
      .mockResolvedValueOnce({ default: { greeting: 'Hello' } })
    const loadPtBr = vi.fn(() => Promise.resolve({ default: { greeting: 'Olá' } }))
    const ensureLoaded = createLocaleLoader(loadEn, loadPtBr)

    await expect(ensureLoaded()).rejects.toThrow('chunk load failed')
    expect(loadEn).toHaveBeenCalledOnce()

    await expect(ensureLoaded()).resolves.toBeUndefined()
    expect(loadEn).toHaveBeenCalledTimes(2)
  })
})
