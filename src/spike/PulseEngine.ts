/**
 * PB-34 spike — a trivial interactive island engine (ADR-018 decision 4).
 *
 * Plain TypeScript. No import from `vue`, `reka-ui`, or `@/shared/components`.
 * A `requestAnimationFrame` loop over non-reactive internal state drawing to a
 * `<canvas>`. This is the shape the fretboard renderer and the practice runner
 * take (per PB-28); a restyle of the surrounding app cannot reach in here.
 */
export class PulseEngine {
  private readonly ctx: CanvasRenderingContext2D
  private rafId = 0
  private startedAt = 0
  private running = false

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('PulseEngine: 2d context unavailable')
    this.ctx = ctx
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.startedAt = performance.now()
    const frame = (now: number) => {
      if (!this.running) return
      this.draw((now - this.startedAt) / 1000)
      this.rafId = requestAnimationFrame(frame)
    }
    this.rafId = requestAnimationFrame(frame)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
  }

  private draw(t: number): void {
    const { width, height } = this.canvas
    const r = 8 + 6 * (1 + Math.sin(t * 3)) * 0.5
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.beginPath()
    this.ctx.arc(width / 2, height / 2, r, 0, Math.PI * 2)
    this.ctx.fill()
  }
}
