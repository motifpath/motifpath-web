import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'

import { rootFifthItem } from '@/features/student/testing/chordItems'
import { drillBass } from '@/shared/testUtils/drill'

import SessionRootFifth from './SessionRootFifth.vue'

const meta = {
  title: 'Practice/SessionRootFifth',
  component: SessionRootFifth,
  args: { item: rootFifthItem(), bass: drillBass },
  render: (args) => ({
    components: { SessionRootFifth },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><SessionRootFifth v-bind="args" /></div>',
  }),
} satisfies Meta<typeof SessionRootFifth>

export default meta
type Story = StoryObj<typeof meta>

/** Ready: the root and fifth marked in the plan's window, the metronome row at the plan's tempo. */
export const Ready: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: /^root, string 4, fret 3$|^fundamental, corda 4, casa 3$/i })).toBeVisible()
    await expect(canvas.getByRole('button', { name: /start the take|começar a execução/i })).toBeEnabled()
  },
}

/** The bass isn't known: the item can only be skipped. */
export const Unavailable: Story = { args: { bass: undefined } }
