import { describe, expect, it } from 'vitest'

import { effectiveLabelMode, markerTextKind } from '@/shared/utils/diagramLabels'
import { makeDiagramRef } from '@/shared/testUtils/diagram'

describe('effectiveLabelMode', () => {
  it('is the ref’s own label when it has one, whatever the diagram displays', () => {
    expect(effectiveLabelMode(makeDiagramRef({ layers: { label: 'note' } }), 'hidden')).toBe('note')
    expect(effectiveLabelMode(makeDiagramRef({ layers: { label: 'custom' } }), 'hidden')).toBe('custom')
  })

  it('reads an older ref without a label: intervals off shows nothing', () => {
    expect(effectiveLabelMode(makeDiagramRef({ layers: { intervals: false } }), 'interval')).toBe('none')
  })

  it('reads an older ref with intervals on as custom labels over the diagram’s own display, as it always drew', () => {
    expect(effectiveLabelMode(makeDiagramRef({ layers: { intervals: true } }), 'note')).toBe('custom')
    expect(effectiveLabelMode(makeDiagramRef({ layers: {} }), 'interval')).toBe('custom')
  })

  it('reads an older ref on a diagram that hides its labels as showing nothing, custom labels included', () => {
    expect(effectiveLabelMode(makeDiagramRef({ layers: { intervals: true } }), 'hidden')).toBe('none')
  })
})

describe('markerTextKind', () => {
  it.each([
    ['interval', true, 'note', 'interval'],
    ['note', true, 'interval', 'note'],
    ['none', true, 'interval', null],
    ['custom', true, 'hidden', 'custom'],
    ['custom', false, 'interval', 'interval'],
    ['custom', false, 'note', 'note'],
    ['custom', false, 'hidden', null],
  ] as const)('mode %s, custom label %s, diagram display %s → %s', (mode, hasCustom, display, expected) => {
    expect(markerTextKind(mode, hasCustom, display)).toBe(expected)
  })
})
