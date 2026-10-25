import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent } from 'storybook/test'

import { chordInstrumentsHandler } from '@/features/student/testing/chordItems'
import { songItem } from '@/features/student/testing/songItems'
import { drillBass, drillGuitar } from '@/shared/testUtils/drill'
import { notFound } from '@/shared/testUtils/msw/handlers'

import SessionSong from './SessionSong.vue'

const meta = {
  title: 'Practice/SessionSong',
  component: SessionSong,
  args: { item: songItem(), songRating: null, layout: drillGuitar },
  parameters: { msw: { handlers: { instruments: chordInstrumentsHandler } } },
  render: (args) => ({
    components: { SessionSong },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionSong v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionSong>

export default meta
type Story = StoryObj<typeof meta>

/** Before the song on guitar: why it was picked, its chords as boxes, Start. */
export const BeforeOnGuitar: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/I–IV–I–V/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: /^(start|começar)$/i })).toBeEnabled()
  },
}

/** Before the song on bass: play the root of each chord, the chords as a chart of symbols. */
export const BeforeOnBass: Story = {
  args: { item: songItem({ onBass: true }), layout: drillBass },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Play the root of each chord|Toque a fundamental de cada acorde/)).toBeVisible()
  },
}

/** Playing: the chart as written, with its key by the title, and I played it. */
export const Playing: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /^(start|começar)$/i }))
    await expect(await canvas.findByRole('button', { name: /I played it|Toquei/ })).toBeVisible()
  },
}

/** Rated clean: today's rating, and Finish ends the session. */
export const Rated: Story = {
  args: { songRating: 'clean' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Finish|Concluir/ })).toBeVisible()
  },
}

/** The chart was withdrawn since the session was planned: it can only be skipped. */
export const Withdrawn: Story = {
  parameters: { msw: { handlers: { publishedSongChart: notFound('publishedSongChart') } } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: /Skip|Pular/ })).toBeVisible()
  },
}
