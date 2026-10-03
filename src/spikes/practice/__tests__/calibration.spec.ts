import { describe, expect, it } from 'vitest'

import { simulatePopulation } from '@/spikes/practice/populationSimulator'
import type { PopulationOptions } from '@/spikes/practice/populationSimulator'
import { calibrate, knowersMedian, sessionObservations } from '@/spikes/practice/thresholds'
import type { Threshold } from '@/spikes/practice/thresholds'

const NAME = 'fretboard_cell:name_the_note'
const TRUE_FLUENT_MS = 2500
const AFTER = '2026-11-01T00:00:00Z'

function prior(fluent_ms: number): Threshold {
  return {
    template: NAME,
    version: 1,
    effective_from: '2026-10-01T00:00:00Z',
    fluent_ms,
    source: 'benchmark',
    sessions: 0,
    students: 0,
  }
}

function run(overrides: Partial<PopulationOptions> = {}) {
  const population = simulatePopulation({
    students: 40,
    sessions_per_student: 8,
    true_fluent_ms: TRUE_FLUENT_MS,
    overconfident_share: 0,
    felt_noise: 0.15,
    seed: 3,
    ...overrides,
  })
  return {
    population,
    observations: sessionObservations(population.evidence, population.felt, NAME),
  }
}

const error = (ms: number) => Math.abs(ms - TRUE_FLUENT_MS) / TRUE_FLUENT_MS

describe('calibration against a population with a known true fluent time', () => {
  it('M12: recovers the true time from a benchmark that was twice too strict', () => {
    const { observations } = run()
    expect(error(calibrate(prior(1250), observations, AFTER).fluent_ms)).toBeLessThan(0.15)
  })

  it('M12: recovers the true time from a benchmark that was twice too lax', () => {
    const { observations } = run()
    expect(error(calibrate(prior(5000), observations, AFTER).fluent_ms)).toBeLessThan(0.15)
  })

  it('M13: a phone-heavy population gives the same answer once tap time is taken out', () => {
    const desktop = run({ phone_share: 0 })
    const phone = run({ phone_share: 0.9 })
    const a = calibrate(prior(2000), desktop.observations, AFTER).fluent_ms
    const b = calibrate(prior(2000), phone.observations, AFTER).fluent_ms
    expect(Math.abs(a - b) / a).toBeLessThan(0.1)
  })

  it('M14: a third of students calling everything easier still lands near the truth', () => {
    const { observations } = run({ overconfident_share: 0.33 })
    expect(error(calibrate(prior(2000), observations, AFTER).fluent_ms)).toBeLessThan(0.2)
  })

  it('M14: time alone lands much further from the truth than with felt ratings', () => {
    const { population, observations } = run()
    const withFelt = error(calibrate(prior(2000), observations, AFTER).fluent_ms)
    const timeOnly = error(knowersMedian(population.evidence, NAME)!)
    expect(timeOnly).toBeGreaterThan(3 * withFelt)
  })

  it('M13: without taking tap time out, the threshold comes out too lax', () => {
    const { population } = run({ phone_share: 0.9 })
    const gross = population.evidence.map((e) =>
      e.source === 'auto_graded' ? { ...e, tap_ms: 0 } : e,
    )
    const uncorrected = calibrate(
      prior(2000),
      sessionObservations(gross, population.felt, NAME),
      AFTER,
    ).fluent_ms
    expect(uncorrected).toBeGreaterThan(TRUE_FLUENT_MS * 1.1)
  })
})
