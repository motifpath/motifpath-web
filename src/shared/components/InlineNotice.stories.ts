import type { Meta, StoryObj } from '@storybook/vue3-vite'

import InlineNotice from './InlineNotice.vue'

const meta = {
  title: 'States/InlineNotice',
  component: InlineNotice,
  args: { message: "Your courses didn't load." },
} satisfies Meta<typeof InlineNotice>

export default meta
type Story = StoryObj<typeof meta>

export const Failed: Story = {}
export const LongPortuguese: Story = { args: { message: 'Não foi possível carregar seus cursos. Verifique sua conexão.' } }
