import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import FretboardMarkerShape from '@/shared/components/diagram/FretboardMarkerShape.vue'
import { MARKER_RADIUS } from '@/shared/utils/fretboardGeometry'
import { starPolygonPoints } from '@/shared/utils/diagramMarkerShapes'

function mountShape(shape: 'dot' | 'square' | 'star', attrs: Record<string, unknown> = {}) {
  return mount(
    defineComponent({
      render: () => h('svg', [h(FretboardMarkerShape, { cx: 100, cy: 50, shape, ...attrs })]),
    }),
  )
}

describe('FretboardMarkerShape', () => {
  it('draws a dot as a circle of the marker radius, centred on its point', () => {
    const circle = mountShape('dot').get('circle')

    expect(circle.attributes()).toMatchObject({ cx: '100', cy: '50', r: String(MARKER_RADIUS) })
  })

  it('draws a square as wide as a dot, centred on its point', () => {
    const square = mountShape('square').get('rect')

    expect(Number(square.attributes('width'))).toBe(2 * (MARKER_RADIUS - 2))
    expect(Number(square.attributes('x')) + Number(square.attributes('width')) / 2).toBe(100)
    expect(Number(square.attributes('y')) + Number(square.attributes('height')) / 2).toBe(50)
  })

  it('draws a star centred on its point', () => {
    const star = mountShape('star').get('polygon')

    expect(star.attributes('points')).toBe(starPolygonPoints(100, 50, 21, 10))
  })

  it('outlines every shape, so an authored color close to the wood stays distinguishable', () => {
    for (const shape of ['dot', 'square', 'star'] as const) {
      const drawn = mountShape(shape).get('svg > *')
      expect(drawn.classes()).toContain('stroke-surface')
      expect(drawn.attributes('stroke-width')).toBe('2')
    }
  })

  it("takes the parent's fill class, style and test hook", () => {
    const drawn = mountShape('dot', { class: 'fill-accent', style: { fill: '#123456' }, 'data-test': 'marker' }).get('circle')

    expect(drawn.classes()).toContain('fill-accent')
    expect(drawn.attributes('style')).toContain('fill: #123456')
    expect(drawn.attributes('data-test')).toBe('marker')
  })
})
