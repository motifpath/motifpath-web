import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor } from 'storybook/test'

import { BASS_TUNING, changeMinute, chordChangeItem, chordDiagramHandler, chordInstrumentsHandler, rootChangeItem } from '@/features/student/testing/chordItems'
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

/** Ready: both chords, the tempo to change at, the minute not started. */
export const Ready: Story = {}

/** A change never played: no best yet, at the ladder's first tempo. */
export const NeverPlayed: Story = {
  args: { item: chordChangeItem('G', 'D', changeMinute({ start_tempo_bpm: 40, best_clean_changes_per_minute: null, last_changes_per_minute: null })) },
}

/** On bass: both roots marked on the board. */
export const BassRoots: Story = { args: { item: rootChangeItem(), tuning: BASS_TUNING } }

/** The chords can't be drawn: the change can only be skipped. */
export const Unavailable: Story = { parameters: { msw: { handlers: { diagram: failing('diagram') } } } }

/**
 * The minute in a real browser: a bar of count-in at the tempo, then the timer runs with every
 * control locked but Restart, which makes it ready again. Played fast so the count-in takes a second.
 */
export const TheMinuteRuns: Story = {
  args: { item: chordChangeItem('Am', 'C', changeMinute({ start_tempo_bpm: 240 })) },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /start the minute|começar o minuto/i }))
    await expect(canvas.getByText('4')).toBeVisible()

    await waitFor(() => expect(canvas.getByRole('timer')).toHaveTextContent('0:59'), { timeout: 4_000 })
    const restart = canvas.getByRole('button', { name: /restart|recomeçar/i })
    for (const button of canvas.getAllByRole('button').filter((b) => b !== restart)) {
      const off = button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true'
      await expect(off).toBe(true)
    }
    await expect(canvas.getByRole('slider')).toBeDisabled()

    await userEvent.click(restart)
    await expect(canvas.getByRole('timer')).toHaveTextContent('1:00')
    await expect(canvas.getByRole('slider')).toBeEnabled()
    await expect(canvas.getByRole('button', { name: /start the minute|começar o minuto/i })).toBeVisible()
  },
}
