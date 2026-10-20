import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PracticeHeader from './PracticeHeader.vue'

const meta = {
  title: 'Shells/PracticeHeader',
  component: PracticeHeader,
  args: { exitLabel: 'End session', position: { current: 4, total: 10 }, progress: [1, 1, 1, 0.5, 0, 0, 0, 0, 0, 0] },
  render: (args) => ({
    components: { PracticeHeader },
    setup: () => ({ args }),
    template: '<div class="max-w-[35rem] px-5"><PracticeHeader v-bind="args" /></div>',
  }),
} satisfies Meta<typeof PracticeHeader>

export default meta
type Story = StoryObj<typeof meta>

/** During a run: × ends it, with the position and one segment per item; a play-along's fills by takes. */
export const DuringARun: Story = {}

/** Setup, today's plan and the summary: only the way out. */
export const BeforeTheRun: Story = { args: { exitLabel: 'Close', position: undefined, progress: undefined } }
