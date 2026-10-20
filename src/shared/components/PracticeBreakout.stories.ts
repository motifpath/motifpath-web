import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PracticeBreakout from './PracticeBreakout.vue'

const meta = {
  title: 'Practice/PracticeBreakout',
  component: PracticeBreakout,
  render: () => ({
    components: { PracticeBreakout },
    template: `<div class="mx-auto flex w-full max-w-[35rem] flex-col gap-4 px-5">
      <p>The text column stays 560 px wide.</p>
      <PracticeBreakout><div class="h-40 rounded-lg border border-border bg-surface-raised" /></PracticeBreakout>
      <p>Resize the canvas: on a phone the box stays in the column, on Medium it grows to 720 px, on Expanded to 960 px.</p>
    </div>`,
  }),
} satisfies Meta<typeof PracticeBreakout>

export default meta
type Story = StoryObj<typeof meta>

/** A diagram's room, inside the shell's column. */
export const InTheShell: Story = {}
