import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PracticeActionBar from './PracticeActionBar.vue'
import PracticeShell from './PracticeShell.vue'
import PrimaryButton from './PrimaryButton.vue'

const meta = {
  title: 'Shells/PracticeShell',
  component: PracticeShell,
  args: { exitLabel: 'End session', position: { current: 4, total: 10 }, progress: [1, 1, 0, 1] },
  render: (args) => ({
    components: { PracticeShell, PracticeActionBar, PrimaryButton },
    setup: () => ({ args }),
    template: `<PracticeShell v-bind="args">
  <div class="space-y-4">
    <p class="text-sm font-semibold text-accent-text">Hear the third</p>
    <p class="text-lg font-semibold">Is this triad major or minor?</p>
  </div>
  <PracticeActionBar><PrimaryButton data-primary-action class="w-full">Continue</PrimaryButton></PracticeActionBar>
</PracticeShell>`,
  }),
} satisfies Meta<typeof PracticeShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const WithoutPosition: Story = { args: { position: undefined, progress: undefined } }
