import type { Meta, StoryObj } from '@storybook/vue3-vite'

import StateError from './StateError.vue'

const meta = {
  title: 'States/StateError',
  component: StateError,
  args: { message: 'We couldn’t load your path.' },
} satisfies Meta<typeof StateError>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const LongPortuguese: Story = {
  args: { message: 'Não foi possível carregar a sua trilha. Verifique a sua conexão e tente de novo em alguns instantes.' },
}
