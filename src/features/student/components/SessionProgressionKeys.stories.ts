import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { BASS_TUNING, chordDiagramHandler, chordInstrumentsHandler } from '@/features/student/testing/chordItems'
import { TOUR_IN_G, tourItem } from '@/features/student/testing/tourItems'
import { failing } from '@/shared/testUtils/msw/handlers'

import SessionProgressionKeys from './SessionProgressionKeys.vue'

const meta = {
  title: 'Practice/SessionProgressionKeys',
  component: SessionProgressionKeys,
  args: { item: tourItem(), tempo: 84, noteValue: 'quarters', takesLeft: 3, takesTotal: 3, tour: TOUR_IN_G, tuning: null },
  parameters: { msw: { handlers: { diagram: chordDiagramHandler, instruments: chordInstrumentsHandler } } },
  render: (args) => ({
    components: { SessionProgressionKeys },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionProgressionKeys v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionProgressionKeys>

export default meta
type Story = StoryObj<typeof meta>

/** Ready in G: the chart in chord symbols, five keys of the cycle around G, the tempo, Start take in G. */
export const Ready: Story = {}

/** The tour never played: the first take, in C at 60 BPM, no key clean. */
export const FirstTake: Story = {
  args: { tempo: 60, tour: { key: 'C', speed: 60, clean: [] } },
}

/** On guitar, a chord's box opens on demand, from the voicing the plan gives. */
export const ChordBoxOnDemand: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /show the em box|mostrar o diagrama de em/i }))
    await expect(canvas.getByRole('heading', { name: 'Em' })).toBeVisible()
  },
}

/** On bass, a chord's root, third and fifth are marked on the board. */
export const BassChordTones: Story = {
  args: { item: tourItem({ onBass: true }), tuning: BASS_TUNING },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /root, 3rd and 5th of em|terça e a quinta de em/i }))
    await expect(canvas.getByRole('heading', { name: /^Em:/ })).toBeVisible()
    await expect(canvas.getByRole('img', { name: /^(third|terça),/i })).toBeVisible()
  },
}

/** The chords can't be loaded: the tour can only be skipped. */
export const Unavailable: Story = { parameters: { msw: { handlers: { diagram: failing('diagram') } } } }
