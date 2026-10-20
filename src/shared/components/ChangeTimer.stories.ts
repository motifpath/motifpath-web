import type { Meta, StoryObj } from '@storybook/vue3-vite'

import ChangeTimer from './ChangeTimer.vue'

const meta = {
  title: 'Practice/ChangeTimer',
  component: ChangeTimer,
  args: { remainingMs: 42_000, totalMs: 60_000, running: true, detail: 'change on every beat' },
  render: (args) => ({
    components: { ChangeTimer },
    setup: () => ({ args }),
    template: '<div class="w-[342px]"><ChangeTimer v-bind="args" /></div>',
  }),
} satisfies Meta<typeof ChangeTimer>

export default meta
type Story = StoryObj<typeof meta>

/** The minute running, with the metronome. */
export const Running: Story = {}

/** Before Start the minute: the whole time, and the count-in to come. */
export const Ready: Story = { args: { remainingMs: 60_000, running: false } }

/** The time is up. */
export const Finished: Story = { args: { remainingMs: 0 } }

/** No detail: the caption is only the time it counts down from. */
export const NoDetail: Story = { args: { detail: undefined } }

export const LongPortuguese: Story = { args: { remainingMs: 60_000, running: false, detail: 'troque a cada tempo, sem parar entre os acordes' } }
