import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import DrillFretboard from './DrillFretboard.vue'

const meta = {
  title: 'Diagrams/DrillFretboard',
  component: DrillFretboard,
  args: { tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], maxFret: 12, label: 'Find the note on the fretboard' },
} satisfies Meta<typeof DrillFretboard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Lit: Story = { args: { lit: { string: 3, fret: 5 } } }
export const AskedString: Story = { args: { askedString: 5 } }
export const Marked: Story = {
  args: { locked: true, marks: [{ string: 3, fret: 5, mark: 'right' }, { string: 2, fret: 3, mark: 'wrong' }] },
}
/** Finding every G in frets 3 to 7, checked: two places found and ringed, one missed, one extra tap. */
export const EveryInstanceChecked: Story = {
  args: {
    locked: true,
    fretWindow: { from: 3, to: 7 },
    tapStrings: [1, 2, 3, 4, 5, 6],
    selectable: true,
    selected: [{ string: 6, fret: 3 }, { string: 1, fret: 3 }, { string: 5, fret: 5 }],
    marks: [
      { string: 1, fret: 3, mark: 'right' },
      { string: 4, fret: 5, mark: 'right' },
      { string: 5, fret: 5, mark: 'wrong' },
      { string: 6, fret: 3, mark: 'right' },
    ],
  },
}

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function rects(canvas: HTMLElement, selector: string) {
  return Array.from(canvas.querySelectorAll(selector)).map((element) => element.getBoundingClientRect())
}

function attrs(canvas: HTMLElement, selector: string, name: string) {
  return Array.from(canvas.querySelectorAll(selector)).map((element) => element.getAttribute(name))
}

/** A drill never scrolls sideways: neither the page nor the board is wider than the screen. */
async function expectNoSidewaysScroll(canvas: HTMLElement) {
  const board = canvas.querySelector('[data-test="drill-fretboard"]')!
  await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  await expect(board.scrollWidth).toBeLessThanOrEqual(board.clientWidth)
}

/** On a phone, a window at the nut: the open string and frets 1 to 5, each place 48 px or wider. */
export const WindowAtTheNut: Story = {
  args: { fretWindow: { from: 0, to: 5 }, askedString: 6, tapStrings: [6] },
  globals: { viewport: { value: 'compact' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    await expect(window.innerWidth).toBe(390)
    await expectNoSidewaysScroll(canvasElement)
    await expect(attrs(canvasElement, '[data-test="drill-cell"]', 'data-fret')).toEqual(['0', '1', '2', '3', '4', '5'])
    for (const place of rects(canvasElement, '[data-test="drill-cell"]')) await expect(place.width).toBeGreaterThanOrEqual(48)
    const [nut] = rects(canvasElement, '[data-test="diagram-nut"]')
    const [open] = rects(canvasElement, '[data-test="drill-cell"]')
    await expect(open!.right).toBeLessThanOrEqual(nut!.left + nut!.width / 2 + 0.5)
  },
}

/** On a phone, a window up the neck: only its five frets are drawn. */
export const WindowUpTheNeck: Story = {
  args: { fretWindow: { from: 3, to: 7 }, askedString: 6, tapStrings: [6] },
  globals: { viewport: { value: 'compact' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    await expect(window.innerWidth).toBe(390)
    await expectNoSidewaysScroll(canvasElement)
    await expect(Array.from(canvasElement.querySelectorAll('[data-test="fret-number"]')).map((n) => n.textContent?.trim())).toEqual(['3', '4', '5', '6', '7'])
    for (const place of rects(canvasElement, '[data-test="drill-cell"]')) await expect(place.width).toBeGreaterThanOrEqual(48)
  },
}

/** Name the note on a phone: the window is drawn with the cell lit in it. */
export const NameTheNoteInAWindow: Story = {
  args: { fretWindow: { from: 7, to: 11 }, lit: { string: 4, fret: 9 } },
  globals: { viewport: { value: 'compact' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    await expectNoSidewaysScroll(canvasElement)
    await expect(Array.from(canvasElement.querySelectorAll('[data-test="fret-number"]')).map((n) => n.textContent?.trim())).toEqual(['7', '8', '9', '10', '11'])
    await expect(attrs(canvasElement, '[data-test="lit-cell"]', 'data-fret')).toEqual(['9'])
  },
}

/** Wide enough for the whole neck at 48 px a place: the frets outside the window are dimmed and take no tap. */
export const WindowOnAWideScreen: Story = {
  args: { fretWindow: { from: 6, to: 10 }, askedString: 6, tapStrings: [6] },
  globals: { viewport: { value: 'medium' } },
  play: async ({ canvasElement }) => {
    await settle(100)
    await expect(window.innerWidth).toBe(720)
    await expectNoSidewaysScroll(canvasElement)
    await expect(canvasElement.querySelectorAll('[data-test="fret-number"]')).toHaveLength(13)
    await expect(attrs(canvasElement, '[data-test="drill-cell"]', 'data-fret')).toEqual(['6', '7', '8', '9', '10'])
    await expect(attrs(canvasElement, '[data-test="outside-window"]', 'data-frets')).toEqual(['0-5', '11-12'])
    for (const place of rects(canvasElement, '[data-test="drill-cell"]')) await expect(place.width).toBeGreaterThanOrEqual(48)
  },
}
