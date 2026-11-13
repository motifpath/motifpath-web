import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { changeTake, chordChangeItem, chordDiagramHandler, chordInstrumentsHandler, rootChangeItem } from '@/features/student/testing/chordItems'
import { drillBass } from '@/shared/testUtils/drill'
import { failing } from '@/shared/testUtils/msw/handlers'

import SessionChordChange from './SessionChordChange.vue'

const meta = {
  title: 'Practice/SessionChordChange',
  component: SessionChordChange,
  args: { item: chordChangeItem('Am', 'C') },
  parameters: { msw: { handlers: { diagram: chordDiagramHandler, instruments: chordInstrumentsHandler } } },
  render: (args) => ({
    components: { SessionChordChange },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionChordChange v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionChordChange>

export default meta
type Story = StoryObj<typeof meta>

/** Ready: both chords, the metronome row at the plan's tempo, ten cycles to play. */
export const Ready: Story = {}

/** A change never played: no best yet, at the ladder's first tempo. */
export const NeverPlayed: Story = {
  args: { item: chordChangeItem('G', 'D', changeTake({ start_tempo_bpm: 40, best_clean_tempo_bpm: null })) },
}

/** On bass: both roots marked on the board, in the plan's window; the take sounds them. */
export const BassRoots: Story = { args: { item: rootChangeItem(), bass: drillBass } }

/** The chords can't be drawn: the change can only be skipped. */
export const Unavailable: Story = { parameters: { msw: { handlers: { diagram: failing('diagram') } } } }

/**
 * The take in a real browser: a bar of count-in at the tempo, then the cycles count down with every
 * control locked but Restart, which makes it ready again; played through, four shares are asked.
 * Played fast so the whole take lasts six seconds.
 */
export const TheTakeRuns: Story = {
  args: { item: chordChangeItem('Am', 'C', changeTake({ start_tempo_bpm: 240 })) },
  play: async ({ canvas, userEvent }) => {
    const start = () => canvas.findByRole('button', { name: /start the take|começar a execução/i })
    await userEvent.click(await start())
    await expect(canvas.getByText('4')).toBeVisible()

    const restart = await canvas.findByRole('button', { name: /restart|recomeçar/i })
    for (const button of canvas.getAllByRole('button').filter((b) => b !== restart)) {
      const off = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
      await expect(off).toBe(true)
    }
    await expect(canvas.getByRole('slider')).toBeDisabled()

    await userEvent.click(restart)
    await expect(canvas.getByRole('slider')).toBeEnabled()

    await userEvent.click(await start())
    const shares = await canvas.findByRole('group', { name: /share of the changes|parte das trocas/i }, { timeout: 10_000 })
    await expect(shares).toHaveTextContent('25 %50 %75 %100 %')
  },
}
