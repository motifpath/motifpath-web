import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PracticeActionBar from './PracticeActionBar.vue'
import PrimaryButton from './PrimaryButton.vue'

const meta = {
  title: 'Shells/PracticeActionBar',
  component: PracticeActionBar,
  render: () => ({
    components: { PracticeActionBar, PrimaryButton },
    template: '<PracticeActionBar><PrimaryButton class="w-full">Continue</PrimaryButton></PracticeActionBar>',
  }),
} satisfies Meta<typeof PracticeActionBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
