import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PulseEngine } from '@/spike/PulseEngine'

// jsdom has no canvas 2d context; stub the slice the engine touches.
function fakeCanvas(): HTMLCanvasElement {
  const ctx = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
  }
  return { width: 120, height: 60, getContext: () => ctx } as unknown as HTMLCanvasElement
}

describe('PulseEngine', () => {
  let raf: ReturnType<typeof vi.fn>
  let caf: ReturnType<typeof vi.fn>

  beforeEach(() => {
    raf = vi.fn().mockReturnValue(42)
    caf = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', caf)
    vi.stubGlobal('performance', { now: () => 0 })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('has no dependency on the component layer', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(process.cwd(), 'src/spike/PulseEngine.ts'), 'utf8')
    const imports = src.match(/^\s*import .+$/gm) ?? []
    expect(imports).toHaveLength(0)
  })

  it('schedules a frame on start and cancels it on stop', () => {
    const engine = new PulseEngine(fakeCanvas())

    engine.start()
    expect(raf).toHaveBeenCalledTimes(1)

    engine.stop()
    expect(caf).toHaveBeenCalledWith(42)
  })

  it('does not stack loops when start is called twice', () => {
    const engine = new PulseEngine(fakeCanvas())
    engine.start()
    engine.start()
    expect(raf).toHaveBeenCalledTimes(1)
    engine.stop()
  })

  it('stops driving frames once stopped', () => {
    const engine = new PulseEngine(fakeCanvas())
    engine.start()
    const frame = raf.mock.calls[0][0] as FrameRequestCallback
    engine.stop()
    raf.mockClear()
    frame(16)
    expect(raf).not.toHaveBeenCalled()
  })
})
