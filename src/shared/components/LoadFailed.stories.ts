import type { Meta, StoryObj } from '@storybook/vue3-vite'

import LoadFailed from './LoadFailed.vue'

const meta = {
  title: 'States/LoadFailed',
  component: LoadFailed,
  args: { message: "Your courses didn't load." },
} satisfies Meta<typeof LoadFailed>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const LongPortuguese: Story = { args: { message: 'Não foi possível carregar seus cursos. Verifique sua conexão.' } }
