import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const engine = vi.hoisted(() => ({
  start: vi.fn(),
  update: vi.fn(),
  stop: vi.fn(),
  running: vi.fn(() => false),
  beatAt: vi.fn((): number | null => null),
}))
vi.mock('@/shared/audio/metronome', () => ({ createMetronome: () => engine }))
vi.mock('@/shared/audio/audioContext', () => ({ unlockAudioContext: () => ({ currentTime: 0 }), audibleTime: () => 0 }))
vi.mock('@/shared/audio/clickSink', () => ({ createClickSink: () => ({ click: vi.fn(), stopAll: vi.fn() }) }))
const track = vi.hoisted(() => vi.fn())
vi.mock('@/shared/composables/useEventTracking', () => ({ useEventTracking: () => ({ track }) }))

import MetronomeTool from '@/shared/components/MetronomeTool.vue'

enableAutoUnmount(afterEach)

const fetchSpy = vi.fn()

beforeEach(() => {
  Object.values(engine).forEach((fn) => fn.mockClear())
  track.mockClear()
  fetchSpy.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

function mountTool() {
  return mount(MetronomeTool, { attachTo: document.body })
}

const settings = (overrides: Record<string, unknown> = {}) => ({ bpm: 80, beats: 4, beatValue: 4, noteValue: 'quarters', ...overrides })

describe('MetronomeTool', () => {
  it('opens at 80 BPM in 4/4, in quarters, and silent', () => {
    const tool = mountTool()

    expect(tool.get('[data-test="tempo-value"]').text()).toBe('80 BPM')
    expect(tool.get('[data-test="time-signature"]').text()).toBe('4/4')
    expect(tool.get('[data-test="note-value"]').attributes('aria-label')).toBe('Note value: Quarters')
    expect(tool.findAll('[data-test="beat-dot"]')).toHaveLength(4)
    expect(tool.get('[data-test="metronome-start"]').text()).toBe('Start')
    expect(engine.start).not.toHaveBeenCalled()
  })

  it('starts and stops from its primary action', async () => {
    const tool = mountTool()

    await tool.get('[data-test="metronome-start"]').trigger('click')
    expect(engine.start).toHaveBeenCalledWith(settings())
    expect(tool.get('[data-test="metronome-start"]').text()).toBe('Stop')

    await tool.get('[data-test="metronome-start"]').trigger('click')
    expect(engine.stop).toHaveBeenCalled()
  })

  it('applies a new tempo, note value and bar while it plays', async () => {
    const tool = mountTool()
    await tool.get('[data-test="metronome-start"]').trigger('click')

    tool.findComponent({ name: 'TempoControl' }).vm.$emit('tempo', 100)
    await tool.vm.$nextTick()
    expect(engine.update).toHaveBeenLastCalledWith(settings({ bpm: 100 }))

    tool.findComponent({ name: 'TempoControl' }).vm.$emit('update:noteValue', 'eighths')
    await tool.vm.$nextTick()
    expect(engine.update).toHaveBeenLastCalledWith(settings({ bpm: 100, noteValue: 'eighths' }))

    tool.findComponent({ name: 'TimeSignaturePicker' }).vm.$emit('update:modelValue', { beats: 3, beat_value: 4 })
    await tool.vm.$nextTick()
    expect(engine.update).toHaveBeenLastCalledWith(settings({ bpm: 100, noteValue: 'eighths', beats: 3 }))
    expect(tool.findAll('[data-test="beat-dot"]')).toHaveLength(3)
  })

  it('offers every note value', async () => {
    const tool = mountTool()
    await tool.get('[data-test="note-value"]').trigger('click')

    expect(document.querySelectorAll('[data-test="note-value-choice"]')).toHaveLength(8)
  })

  it('stops when the student leaves it', async () => {
    const tool = mountTool()
    await tool.get('[data-test="metronome-start"]').trigger('click')

    tool.unmount()

    expect(engine.stop).toHaveBeenCalled()
  })

  it('sends nothing', async () => {
    const tool = mountTool()
    await tool.get('[data-test="metronome-start"]').trigger('click')
    tool.findComponent({ name: 'TempoControl' }).vm.$emit('tempo', 120)
    tool.findComponent({ name: 'TempoControl' }).vm.$emit('update:noteValue', 'triplets')
    tool.findComponent({ name: 'TimeSignaturePicker' }).vm.$emit('update:modelValue', { beats: 6, beat_value: 8 })
    await tool.vm.$nextTick()
    tool.unmount()

    expect(track).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
