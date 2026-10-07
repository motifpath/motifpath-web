import type { Meta, StoryObj } from '@storybook/vue3-vite'

import AnswerMark from './AnswerMark.vue'

const meta = {
  title: 'Diagrams/AnswerMark',
  component: AnswerMark,
  args: { mark: 'right', cx: 40, cy: 40, ringRadius: 16, badgeOffset: 14 },
  render: (args) => ({
    components: { AnswerMark },
    setup: () => ({ args }),
    template: '<svg width="80" height="80" viewBox="0 0 80 80"><AnswerMark v-bind="args" /></svg>',
  }),
} satisfies Meta<typeof AnswerMark>

export default meta
type Story = StoryObj<typeof meta>

export const Right: Story = {}
export const Wrong: Story = { args: { mark: 'wrong' } }
