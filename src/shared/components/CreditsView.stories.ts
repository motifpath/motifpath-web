import type { Meta, StoryObj } from '@storybook/vue3-vite'

import { failing, pending, respondWith } from '@/shared/testUtils/msw/handlers'

import CreditsView from './CreditsView.vue'

const meta = {
  title: 'Screens/CreditsView',
  component: CreditsView,
} satisfies Meta<typeof CreditsView>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Empty: Story = { parameters: { msw: { handlers: { voices: respondWith('voices', []) } } } }
export const Loading: Story = { parameters: { msw: { handlers: { voices: pending('voices') } } } }
export const Failed: Story = { parameters: { msw: { handlers: { voices: failing('voices') } } } }
