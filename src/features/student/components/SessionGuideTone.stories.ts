import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { BASS_TUNING, chordDiagramHandler, chordInstrumentsHandler } from '@/features/student/testing/chordItems'
import { guideToneItem } from '@/features/student/testing/guideToneItems'
import { failing } from '@/shared/testUtils/msw/handlers'

import SessionGuideTone from './SessionGuideTone.vue'

const GUITAR_TUNING = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4']

const meta = {
  title: 'Practice/SessionGuideTone',
  component: SessionGuideTone,
  args: { item: guideToneItem(), tuning: GUITAR_TUNING, layoutName: 'Guitar', takesLeft: 3, takesTotal: 3 },
  parameters: { msw: { handlers: { diagram: chordDiagramHandler, instruments: chordInstrumentsHandler } } },
  render: (args) => ({
    components: { SessionGuideTone },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionGuideTone v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionGuideTone>

export default meta
type Story = StoryObj<typeof meta>

/** Ready on guitar: ii–V–I in G, the bars as chord symbols, frets 0–5 with nothing marked, the tempo, Start. */
export const Ready: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByText(/ii–V–I (in|em) G/)).toBeVisible()
    await expect(canvasElement.querySelector('[data-test="lit-cell"]')).toBeNull()
    await expect(canvas.getByRole('button', { name: /start the take|começar/i })).toBeEnabled()
  },
}

/** Accurate on the item, on bass: the 7th of each chord, at 72 BPM, on the bass's board. */
export const SeventhOnBass: Story = {
  args: { item: guideToneItem({ onBass: true, tone: '7', tempo: 72 }), tuning: BASS_TUNING, layoutName: 'Electric bass' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/7th of each chord|7ª de cada acorde/)).toBeVisible()
    await expect(canvas.getByText(/Electric bass · (frets|casas) 0–5/)).toBeVisible()
  },
}

/** The chords can't be loaded: the guide tone can only be skipped. */
export const Unavailable: Story = { parameters: { msw: { handlers: { diagram: failing('diagram') } } } }
