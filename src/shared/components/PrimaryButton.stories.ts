import type { Meta, StoryObj } from '@storybook/vue3-vite'

import PrimaryButton from './PrimaryButton.vue'

const meta = {
  title: 'Actions/PrimaryButton',
  component: PrimaryButton,
  args: { default: 'Start practice' },
} satisfies Meta<typeof PrimaryButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const AsLink: Story = { args: { as: 'RouterLink', to: { name: 'practice-session' }, default: 'Practice' } }

export const LongPortuguese: Story = { args: { default: 'Começar a praticar agora com o violão' } }
